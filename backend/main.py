import platform
import re
import shutil
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, StreamingResponse, HTMLResponse, JSONResponse

import urllib.request
import urllib.error
import json as _json

from backend.database import init_db, get_connection
from backend.paths import APP_DIR, DB_DIR, DB_PATH, FRONTEND_DIR, resource_path
from backend.version import APP_VERSION

app = FastAPI(title="Photonic", version=APP_VERSION)

THUMB_DIR = APP_DIR / "cache" / "thumbnails"


def _like_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _under_pattern(path_str: str) -> str:
    """LIKE pattern matching any path strictly inside the given folder (not a sibling sharing a prefix)."""
    return _like_escape(path_str.replace("/", "\\").rstrip("\\")) + "\\\\%"


def _hidden_sql(alias: str, show_hidden: bool = False, hidden_only: bool = False) -> str:
    """SQL condition fragment filtering hidden photos.

    show_hidden=True → include everything ('').
    hidden_only=True → only hidden photos ('is_hidden = 1').
    otherwise        → exclude hidden photos ('is_hidden = 0').
    `alias` is the table prefix ('', 'p.', 'ph.') used where applicable.
    """
    col = f"{alias}is_hidden"
    if hidden_only:
        return f"{col} = 1"
    if show_hidden:
        return ""
    return f"{col} = 0"

# ── Scan state (shared across threads) ───────────────────────────────────────

_scan_state = {
    "running": False,
    "folder": "",
    "done": 0,
    "total": 0,
    "indexed": 0,
    "skipped": 0,
    "cancel": False,
    "cancelled": False,
}

_scan_lock = threading.Lock()


@app.on_event("startup")
def startup():
    is_new = not DB_PATH.exists()
    init_db()
    if is_new and THUMB_DIR.exists():
        shutil.rmtree(str(THUMB_DIR), ignore_errors=True)
    _backfill_geo()
    _auto_resume()
    _start_update_check(delay=2)  # background update check right after boot, never blocks startup
    _start_telemetry_ping(delay=5)  # anonymous launch ping (opt-out), fire-and-forget


def _auto_resume():
    conn = get_connection()
    folders = conn.execute("SELECT id, path FROM folders").fetchall()
    conn.close()
    if folders:
        _start_scan_all()


def _backfill_geo():
    import threading
    def _run():
        import time
        time.sleep(2)
        try:
            from backend.geo import search as geo_search
        except ImportError:
            return
        conn = get_connection()
        rows = conn.execute(
            "SELECT id, latitude, longitude FROM photos "
            "WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND country IS NULL"
        ).fetchall()
        if not rows:
            conn.close()
            return
        coords = [(r["latitude"], r["longitude"]) for r in rows]
        results = geo_search(coords)
        for row, res in zip(rows, results):
            conn.execute(
                "UPDATE photos SET country = ?, city = ? WHERE id = ?",
                (res.get("cc"), res.get("name"), row["id"])
            )
        conn.commit()
        conn.close()
    threading.Thread(target=_run, daemon=True).start()


def _start_scan(folder_path: str):
    from backend.scanner import scan_folder as _scan
    from backend.thumbnails import generate_all_thumbnails

    # Set synchronously (caller holds _scan_lock) to avoid a start race
    _scan_state["running"] = True
    _scan_state["folder"] = folder_path
    _scan_state["done"] = 0
    _scan_state["total"] = 0
    _scan_state["indexed"] = 0
    _scan_state["skipped"] = 0
    _scan_state["cancel"] = False
    _scan_state["cancelled"] = False

    def _run():
        def progress(done, total, indexed, skipped):
            _scan_state["done"] = done
            _scan_state["total"] = total
            _scan_state["indexed"] = indexed
            _scan_state["skipped"] = skipped

        result = _scan(folder_path, progress_callback=progress, should_cancel=lambda: _scan_state["cancel"])

        if not (result and result.get("cancelled")):
            conn = get_connection()
            rows = conn.execute(
                "SELECT path FROM photos WHERE hash IS NOT NULL AND path LIKE ? ESCAPE '\\'",
                (_under_pattern(folder_path),)
            ).fetchall()
            for r in rows:
                generate_all_thumbnails(r["path"])
            conn.close()

        _scan_state["cancelled"] = bool(result and result.get("cancelled"))
        _scan_state["running"] = False

    threading.Thread(target=_run, daemon=True).start()


def _start_scan_all():
    from backend.scanner import scan_folder as _scan

    # Set synchronously (caller holds _scan_lock) to avoid a start race
    _scan_state["running"] = True
    _scan_state["folder"] = "all"
    _scan_state["done"] = 0
    _scan_state["total"] = 0
    _scan_state["indexed"] = 0
    _scan_state["skipped"] = 0
    _scan_state["cancel"] = False
    _scan_state["cancelled"] = False

    def _run():
        conn = get_connection()
        folders = conn.execute("SELECT path FROM folders").fetchall()
        conn.close()

        grand_total = 0
        grand_done = 0
        cancelled = False

        for f in folders:
            if _scan_state["cancel"]:
                cancelled = True
                break
            folder_path = f["path"]
            _scan_state["folder"] = folder_path
            _scan_state["done"] = 0
            _scan_state["total"] = 0
            _scan_state["indexed"] = 0
            _scan_state["skipped"] = 0

            def progress(done, total, indexed, skipped):
                _scan_state["done"] = done
                _scan_state["total"] = total
                _scan_state["indexed"] = indexed
                _scan_state["skipped"] = skipped

            result = _scan(folder_path, progress_callback=progress, should_cancel=lambda: _scan_state["cancel"])
            grand_total += result["total"] if result else 0
            grand_done += _scan_state["done"]
            if result and result.get("cancelled"):
                cancelled = True
                break

        _scan_state["done"] = grand_done
        _scan_state["total"] = grand_total
        _scan_state["cancelled"] = cancelled
        _scan_state["running"] = False

    threading.Thread(target=_run, daemon=True).start()


# ── API ──────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def status(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("", show_hidden, hidden_only)
    if cond:
        count = conn.execute(f"SELECT COUNT(*) FROM photos WHERE {cond}").fetchone()[0]
    else:
        count = conn.execute("SELECT COUNT(*) FROM photos").fetchone()[0]
    conn.close()
    return {"status": "running", "version": APP_VERSION, "photo_count": count}


@app.get("/api/folders")
def list_folders(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    rows = conn.execute("SELECT id, path FROM folders ORDER BY path").fetchall()
    cond = _hidden_sql("", show_hidden, hidden_only)
    hf = ("AND " + cond + " ") if cond else ""
    result = []
    for r in rows:
        base = r["path"].rstrip("/\\")
        cnt = conn.execute("SELECT COUNT(*) FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf, (_under_pattern(base),)).fetchone()[0]
        result.append({"id": r["id"], "path": r["path"], "photo_count": cnt})
    conn.close()
    return result


@app.get("/api/folders/tree")
def list_folders_tree():
    import re
    conn = get_connection()
    rows = conn.execute("SELECT id, path FROM folders ORDER BY path").fetchall()
    conn.close()

    entries = [{"id": r["id"], "path": r["path"], "children": []} for r in rows]
    roots = []

    for entry in entries:
        parent = None
        for other in entries:
            if other["id"] == entry["id"]:
                continue
            other_prefix = other["path"].rstrip("/\\") + "\\"
            if entry["path"].lower().startswith(other_prefix.lower()):
                if parent is None or len(other["path"]) > len(parent["path"]):
                    parent = other
        if parent:
            parent["children"].append(entry)
        else:
            roots.append(entry)

    def _flatten(nodes, depth=0):
        result = []
        for n in nodes:
            name = re.split(r"[/\\]", n["path"])[-1]
            result.append({
                "id": n["id"],
                "path": n["path"],
                "name": name,
                "depth": depth,
                "has_children": len(n["children"]) > 0,
            })
            result.extend(_flatten(n["children"], depth + 1))
        return result

    return _flatten(roots)


@app.get("/api/folders/browse")
def browse_folder(folder_path: Optional[str] = None, show_hidden: bool = False, hidden_only: bool = False):
    import re, os

    cond = _hidden_sql("", show_hidden, hidden_only)
    hf = ("AND " + cond + " ") if cond else ""

    def _name(path_str):
        return re.split(r"[/\\]", path_str)[-1]

    def _first_segment(rel):
        parts = re.split(r"[/\\]", rel)
        return parts[0] if parts else rel

    conn = get_connection()
    if folder_path is not None:
        parent_path = folder_path.rstrip("/\\")
        all_folders = conn.execute("SELECT id, path FROM folders ORDER BY path").fetchall()

        # Group descendants by immediate child folder name
        child_map = {}
        parent_norm = parent_path.lower().replace("/", "\\")
        for f in all_folders:
            fp = f["path"].rstrip("/\\")
            fp_norm = fp.lower().replace("/", "\\")
            if fp_norm != parent_norm and fp_norm.startswith(parent_norm + "\\"):
                rel = fp[len(parent_path):]
                rel = rel.lstrip("/\\")
                if not rel:
                    continue
                seg = _first_segment(rel)
                if seg not in child_map:
                    child_map[seg] = f
                else:
                    if f["path"] < child_map[seg]["path"]:
                        child_map[seg] = f

        # Also scan actual filesystem for unregistered subfolders
        try:
            for entry in os.scandir(parent_path):
                if entry.is_dir():
                    if entry.name in child_map:
                        # Update path to the actual filesystem path
                        existing = child_map[entry.name]
                        db_path = existing["path"].rstrip("/\\")
                        fs_path = entry.path.rstrip("/\\")
                        # If filesystem path differs from DB, use synthetic id
                        if db_path.lower() != fs_path.lower():
                            child_map[entry.name] = {"id": None, "path": entry.path}
                        # else keep existing DB entry as-is
                    else:
                        child_map[entry.name] = {"id": None, "path": entry.path}
        except (OSError, PermissionError):
            pass

        subfolder_entries = []
        for name, f in sorted(child_map.items(), key=lambda x: x[0].lower()):
            sub_path = f["path"].rstrip("/\\")
            pat = _under_pattern(sub_path)
            cnt = conn.execute("SELECT COUNT(*) FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf, (pat,)).fetchone()[0]
            samples = [r["id"] for r in conn.execute(
                "SELECT id FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf + "ORDER BY date_taken DESC LIMIT 4",
                (pat,)
            ).fetchall()]
            # If registered, use its id; otherwise generate a synthetic one
            fid = f["id"]
            if fid is None:
                fid = -hash(sub_path) % 100000
            subfolder_entries.append({
                "id": fid, "name": name, "path": sub_path,
                "photo_count": cnt, "sample_ids": samples,
            })

        under_pat = _under_pattern(parent_path)
        deeper_pat = under_pat + "\\\\%"
        direct_photos = [dict(r) for r in conn.execute(
            "SELECT id, filename, width, height, camera_model, date_taken, is_hidden "
            "FROM photos WHERE path LIKE ? ESCAPE '\\' AND path NOT LIKE ? ESCAPE '\\' " + hf +
            "ORDER BY date_taken DESC LIMIT 200",
            (under_pat, deeper_pat),
        ).fetchall()]

        conn.close()
        return {
            "folder": {"id": None, "path": parent_path, "name": _name(parent_path)},
            "folders": subfolder_entries,
            "photos": direct_photos,
        }
    else:
        all_folders = conn.execute("SELECT id, path FROM folders ORDER BY path").fetchall()

        # Group top-level folders by first path segment (same logic)
        child_map = {}
        for f in all_folders:
            fp = f["path"].rstrip("/\\")
            is_child = False
            for other in all_folders:
                if other["id"] == f["id"]:
                    continue
                prefix = other["path"].rstrip("/\\") + "\\"
                if fp.lower().startswith(prefix.lower()):
                    is_child = True
                    break
            if not is_child:
                seg = _name(fp)
                child_map[seg] = f

        entries = []
        for name, f in sorted(child_map.items(), key=lambda x: x[0].lower()):
            folder_path = f["path"].rstrip("/\\")
            pat = _under_pattern(folder_path)
            cnt = conn.execute("SELECT COUNT(*) FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf, (pat,)).fetchone()[0]
            samples = [r["id"] for r in conn.execute(
                "SELECT id FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf + "ORDER BY date_taken DESC LIMIT 4",
                (pat,)
            ).fetchall()]
            entries.append({
                "id": f["id"], "name": name, "path": folder_path,
                "photo_count": cnt, "sample_ids": samples,
            })

        conn.close()
        return {"folder": None, "folders": entries, "photos": []}


@app.post("/api/folders")
def add_folder(folder: dict):
    path = folder.get("path", "").strip()
    if not path:
        return {"error": "path is required"}
    conn = get_connection()
    try:
        conn.execute("INSERT INTO folders (path) VALUES (?)", (path,))
        conn.commit()
    except sqlite3.IntegrityError:
        return {"error": "folder already exists"}
    finally:
        conn.close()
    return {"ok": True}


@app.delete("/api/folders/{folder_id}")
def delete_folder(folder_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Scan ─────────────────────────────────────────────────────────────────────

@app.post("/api/scan")
def scan_folder(payload: dict):
    folder_path = payload.get("path", "").strip()
    with _scan_lock:
        if _scan_state["running"]:
            return JSONResponse(
                status_code=409,
                content={"ok": False, "error": "scan_already_running", "folder": _scan_state["folder"]},
            )
        if folder_path == "all":
            _start_scan_all()
            return {"ok": True, "message": "rescan all started"}
        if not folder_path or not Path(folder_path).is_dir():
            return {"error": "invalid folder path"}
        _start_scan(folder_path)
    return {"ok": True, "message": "scan started"}


@app.get("/api/scan/status")
def scan_status():
    return _scan_state


@app.post("/api/scan/cancel")
def cancel_scan():
    if not _scan_state.get("running"):
        return {"ok": False, "error": "no scan running"}
    _scan_state["cancel"] = True
    return {"ok": True}


# ── Photos ───────────────────────────────────────────────────────────────────

@app.get("/api/photos")
def list_photos(
    page: int = Query(1, ge=1),
    per_page: int = Query(80, ge=10, le=500),
    folder_id: Optional[int] = None,
    q: Optional[str] = None,
    camera: Optional[str] = None,
    lens: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    ext: Optional[str] = None,
    rating: Optional[int] = None,
    tag_id: Optional[int] = None,
    collection_id: Optional[int] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    near_city: Optional[str] = None,
    near_km: Optional[float] = None,
    geo: Optional[str] = None,
    is_360: Optional[str] = None,
    show_hidden: bool = False,
    hidden_only: bool = False,
):
    conn = get_connection()
    near_lat = near_lng = None
    if near_city and near_km is not None:
        city_row = conn.execute(
            "SELECT latitude, longitude FROM photos WHERE city = ? AND latitude IS NOT NULL LIMIT 1",
            (near_city,)
        ).fetchone()
        if city_row:
            near_lat = city_row["latitude"]
            near_lng = city_row["longitude"]

    offset = (page - 1) * per_page

    where_parts = []
    params: list = []

    hc = _hidden_sql("p.", show_hidden, hidden_only)
    if hc:
        where_parts.append(hc)

    if folder_id:
        folder_row = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
        if folder_row:
            where_parts.append("p.path LIKE ? ESCAPE '\\'")
            params.append(_under_pattern(folder_row["path"]))

    if collection_id is not None:
        where_parts.append("""p.id IN (
            SELECT pc.photo_id FROM photo_collections pc
            JOIN (
                WITH RECURSIVE descendants AS (
                    SELECT id FROM collections WHERE id = ?
                    UNION ALL
                    SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id
                ) SELECT id FROM descendants
            ) d ON pc.collection_id = d.id
        )""")
        params.append(collection_id)

    if q:
        where_parts.append("(p.filename LIKE ? OR p.camera_model LIKE ? OR p.camera_make LIKE ? OR p.lens LIKE ?)")
        like = f"%{q}%"
        params += [like, like, like, like]

    if camera:
        where_parts.append("p.camera_model LIKE ?")
        params.append(f"%{camera}%")

    if lens:
        where_parts.append("p.lens LIKE ?")
        params.append(f"%{lens}%")

    if date_from:
        where_parts.append("REPLACE(p.date_taken, ':', '-') >= ?")
        params.append(date_from)

    if date_to:
        where_parts.append("REPLACE(p.date_taken, ':', '-') <= ?")
        params.append(date_to + " 23:59:59")

    if ext:
        where_parts.append("p.extension = ?")
        params.append(ext.lower())

    if rating is not None:
        where_parts.append("p.rating >= ?")
        params.append(rating)

    if tag_id is not None:
        where_parts.append("p.id IN (SELECT photo_id FROM photo_tags WHERE tag_id = ?)")
        params.append(tag_id)

    if country:
        where_parts.append("p.country = ?")
        params.append(country)

    if city:
        where_parts.append("p.city = ?")
        params.append(city)

    if geo == "1":
        where_parts.append("p.latitude IS NOT NULL AND p.longitude IS NOT NULL")
    elif geo == "0":
        where_parts.append("(p.latitude IS NULL OR p.longitude IS NULL)")

    if is_360 == "1":
        where_parts.append("""(
            p.camera_model LIKE '%THETA%' OR 
            p.camera_make LIKE '%THETA%' OR 
            p.camera_model LIKE '%INSTA360%' OR 
            p.camera_make LIKE '%INSTA360%' OR 
            (p.camera_model LIKE '%MAX%' AND p.camera_make LIKE '%GOPRO%') OR
            (p.width IS NOT NULL AND p.height IS NOT NULL AND (p.width * 1.0 / p.height) BETWEEN 1.95 AND 2.05)
        )""")
    elif is_360 == "0":
        where_parts.append("""NOT (
            p.camera_model LIKE '%THETA%' OR 
            p.camera_make LIKE '%THETA%' OR 
            p.camera_model LIKE '%INSTA360%' OR 
            p.camera_make LIKE '%INSTA360%' OR 
            (p.camera_model LIKE '%MAX%' AND p.camera_make LIKE '%GOPRO%') OR
            (p.width IS NOT NULL AND p.height IS NOT NULL AND (p.width * 1.0 / p.height) BETWEEN 1.95 AND 2.05)
        )""")

    if near_lat is not None and near_lng is not None and near_km is not None:
        where_parts.append("""(
            6371 * acos(
                cos(radians(?)) * cos(radians(p.latitude))
                * cos(radians(p.longitude) - radians(?))
                + sin(radians(?)) * sin(radians(p.latitude))
            )
        ) <= ?""")
        params += [near_lat, near_lng, near_lat, near_km]

    where = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    total = conn.execute(f"SELECT COUNT(*) FROM photos p {where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT p.id, p.filename, p.width, p.height, p.camera_model, p.date_taken, p.is_hidden, "
        f"(SELECT COUNT(*) FROM photo_tags pt WHERE pt.photo_id = p.id) AS tag_count, "
        f"(SELECT COUNT(*) FROM photo_collections pc WHERE pc.photo_id = p.id) AS collection_count "
        f"FROM photos p {where} ORDER BY p.date_taken DESC, p.filename ASC "
        f"LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()
    conn.close()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "photos": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "width": r["width"],
                "height": r["height"],
                "camera": r["camera_model"],
                "date": r["date_taken"],
                "hidden": bool(r["is_hidden"]),
                "tag_count": r["tag_count"],
                "collection_count": r["collection_count"],
                "thumb": f"/api/photos/{r['id']}/thumb/medium",
            }
            for r in rows
        ],
    }


@app.get("/api/filters")
def get_filters(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("", show_hidden, hidden_only)
    andf = ("AND " + cond + " ") if cond else ""
    whf = ("WHERE " + cond + " ") if cond else ""
    cameras = [r[0] for r in conn.execute(
        "SELECT DISTINCT camera_model FROM photos WHERE camera_model IS NOT NULL AND camera_model != '' " + andf + "ORDER BY camera_model"
    ).fetchall()]
    lenses = [r[0] for r in conn.execute(
        "SELECT DISTINCT lens FROM photos WHERE lens IS NOT NULL AND lens != '' " + andf + "ORDER BY lens"
    ).fetchall()]
    extensions = [r[0] for r in conn.execute(
        "SELECT DISTINCT extension FROM photos " + whf + "ORDER BY extension"
    ).fetchall()]
    date_range = conn.execute(
        "SELECT MIN(date_taken), MAX(date_taken) FROM photos WHERE date_taken IS NOT NULL " + andf
    ).fetchone()
    countries = [r[0] for r in conn.execute(
        "SELECT DISTINCT country FROM photos WHERE country IS NOT NULL " + andf + "ORDER BY country"
    ).fetchall()]
    cities = [r[0] for r in conn.execute(
        "SELECT DISTINCT city FROM photos WHERE city IS NOT NULL " + andf + "ORDER BY city"
    ).fetchall()]
    conn.close()
    return {
        "cameras": cameras,
        "lenses": lenses,
        "extensions": extensions,
        "date_min": date_range[0] if date_range else None,
        "date_max": date_range[1] if date_range else None,
        "countries": countries,
        "cities": cities,
    }


@app.get("/api/photos/geo/bounds")
def geo_bounds(
    folder_id: Optional[int] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    camera: Optional[str] = None,
    lens: Optional[str] = None,
    ext: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    rating: Optional[int] = None,
    collection_id: Optional[int] = None,
    q: Optional[str] = None,
    show_hidden: bool = False,
    hidden_only: bool = False,
):
    conn = get_connection()
    where = "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    params: list = []
    cond = _hidden_sql("", show_hidden, hidden_only)
    if cond:
        where += " AND " + cond
    if country:
        where += " AND country = ?"
        params.append(country)
    if city:
        where += " AND city = ?"
        params.append(city)
    if camera:
        where += " AND camera_model LIKE ?"
        params.append(f"%{camera}%")
    if lens:
        where += " AND lens LIKE ?"
        params.append(f"%{lens}%")
    if ext:
        where += " AND extension = ?"
        params.append(ext.lower())
    if date_from:
        where += " AND REPLACE(date_taken, ':', '-') >= ?"
        params.append(date_from)
    if date_to:
        where += " AND REPLACE(date_taken, ':', '-') <= ?"
        params.append(date_to + " 23:59:59")
    if rating is not None:
        where += " AND rating >= ?"
        params.append(rating)
    if q:
        where += " AND (filename LIKE ? OR camera_model LIKE ? OR camera_make LIKE ? OR lens LIKE ?)"
        like = f"%{q}%"
        params += [like, like, like, like]
    if folder_id is not None:
        folder_row = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
        if folder_row:
            where += " AND path LIKE ? ESCAPE '\\'"
            params.append(_under_pattern(folder_row["path"]))
    if collection_id is not None:
        where += """ AND id IN (
            SELECT pc.photo_id FROM photo_collections pc
            JOIN (
                WITH RECURSIVE descendants AS (
                    SELECT id FROM collections WHERE id = ?
                    UNION ALL
                    SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id
                ) SELECT id FROM descendants
            ) d ON pc.collection_id = d.id
        )"""
        params.append(collection_id)
    row = conn.execute(
        f"SELECT MIN(latitude) as south, MIN(longitude) as west, "
        f"MAX(latitude) as north, MAX(longitude) as east, COUNT(*) as cnt "
        f"FROM photos {where}", params
    ).fetchone()
    conn.close()
    if row and row["cnt"] > 0:
        return {"south": row["south"], "west": row["west"], "north": row["north"], "east": row["east"], "count": row["cnt"]}
    return {"count": 0}


@app.get("/api/photos/geo")
def geo_photos(
    south: Optional[float] = None,
    west: Optional[float] = None,
    north: Optional[float] = None,
    east: Optional[float] = None,
    folder_id: Optional[int] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    camera: Optional[str] = None,
    lens: Optional[str] = None,
    ext: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    rating: Optional[int] = None,
    collection_id: Optional[int] = None,
    q: Optional[str] = None,
    is_360: Optional[str] = None,
    show_hidden: bool = False,
    hidden_only: bool = False,
):
    conn = get_connection()
    where = "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    params: list = []
    cond = _hidden_sql("", show_hidden, hidden_only)
    if cond:
        where += " AND " + cond
    if country:
        where += " AND country = ?"
        params.append(country)
    if city:
        where += " AND city = ?"
        params.append(city)
    if camera:
        where += " AND camera_model LIKE ?"
        params.append(f"%{camera}%")
    if lens:
        where += " AND lens LIKE ?"
        params.append(f"%{lens}%")
    if ext:
        where += " AND extension = ?"
        params.append(ext.lower())
    if date_from:
        where += " AND REPLACE(date_taken, ':', '-') >= ?"
        params.append(date_from)
    if date_to:
        where += " AND REPLACE(date_taken, ':', '-') <= ?"
        params.append(date_to + " 23:59:59")
    if rating is not None:
        where += " AND rating >= ?"
        params.append(rating)
    if q:
        where += " AND (filename LIKE ? OR camera_model LIKE ? OR camera_make LIKE ? OR lens LIKE ?)"
        like = f"%{q}%"
        params += [like, like, like, like]
    if is_360 == "1":
        where += """ AND (
            camera_model LIKE '%THETA%' OR 
            camera_make LIKE '%THETA%' OR 
            camera_model LIKE '%INSTA360%' OR 
            camera_make LIKE '%INSTA360%' OR 
            (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') OR
            (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05)
        )"""
    elif is_360 == "0":
        where += """ AND NOT (
            camera_model LIKE '%THETA%' OR 
            camera_make LIKE '%THETA%' OR 
            camera_model LIKE '%INSTA360%' OR 
            camera_make LIKE '%INSTA360%' OR 
            (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') OR
            (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05)
        )"""
    if south is not None and west is not None and north is not None and east is not None:
        where += " AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?"
        params += [south, north, west, east]
    if folder_id is not None:
        folder_row = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
        if folder_row:
            where += " AND path LIKE ? ESCAPE '\\'"
            params.append(_under_pattern(folder_row["path"]))
    if collection_id is not None:
        where += """ AND id IN (
            SELECT pc.photo_id FROM photo_collections pc
            JOIN (
                WITH RECURSIVE descendants AS (
                    SELECT id FROM collections WHERE id = ?
                    UNION ALL
                    SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id
                ) SELECT id FROM descendants
            ) d ON pc.collection_id = d.id
        )"""
        params.append(collection_id)

    total = conn.execute(f"SELECT COUNT(*) FROM photos {where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT id, filename, latitude, longitude, camera_model, date_taken, width, height, is_hidden, "
        f"(SELECT COUNT(*) FROM photo_tags pt WHERE pt.photo_id = photos.id) AS tag_count, "
        f"(SELECT COUNT(*) FROM photo_collections pc WHERE pc.photo_id = photos.id) AS collection_count "
        f"FROM photos {where}",
        params,
    ).fetchall()
    conn.close()

    return {
        "total": total,
        "photos": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "lat": r["latitude"],
                "lng": r["longitude"],
                "camera": r["camera_model"],
                "date": r["date_taken"],
                "width": r["width"],
                "height": r["height"],
                "hidden": bool(r["is_hidden"]),
                "tag_count": r["tag_count"],
                "collection_count": r["collection_count"],
                "thumb": f"/api/photos/{r['id']}/thumb/small",
            }
            for r in rows
        ],
    }


@app.post("/api/photos/bulk-tags")
def bulk_add_tag(payload: dict):
    photo_ids = payload.get("photo_ids") or []
    tag_id = payload.get("tag_id")
    if not isinstance(photo_ids, list) or not photo_ids or not tag_id:
        return {"error": "photo_ids (list) and tag_id are required"}
    conn = get_connection()
    added = 0
    try:
        for pid in photo_ids:
            cur = conn.execute(
                "INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)",
                (pid, tag_id),
            )
            added += cur.rowcount if cur.rowcount > 0 else 0
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "added": added}


@app.post("/api/photos/bulk-collections")
def bulk_add_to_collection(payload: dict):
    photo_ids = payload.get("photo_ids") or []
    collection_id = payload.get("collection_id")
    if not isinstance(photo_ids, list) or not photo_ids or not collection_id:
        return {"error": "photo_ids (list) and collection_id are required"}
    conn = get_connection()
    added = 0
    try:
        for pid in photo_ids:
            cur = conn.execute(
                "INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)",
                (pid, collection_id),
            )
            added += cur.rowcount if cur.rowcount > 0 else 0
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "added": added}


@app.post("/api/photos/bulk-hide")
def bulk_hide(payload: dict):
    photo_ids = payload.get("photo_ids") or []
    hidden = payload.get("hidden", True)
    if not isinstance(photo_ids, list) or not photo_ids:
        return {"error": "photo_ids (list) is required"}
    conn = get_connection()
    try:
        conn.executemany(
            "UPDATE photos SET is_hidden = ? WHERE id = ?",
            [(1 if hidden else 0, pid) for pid in photo_ids],
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "updated": len(photo_ids)}


@app.get("/api/photos/{photo_id}")
def get_photo(photo_id: int):
    conn = get_connection()
    r = conn.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r:
        return {"error": "not found"}
    return dict(r)


@app.post("/api/photos/{photo_id}/open")
def open_photo(photo_id: int):
    import os
    conn = get_connection()
    r = conn.execute("SELECT path FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r or not Path(r["path"]).is_file():
        return {"error": "file not found"}
    os.startfile(r["path"])
    return {"ok": True}


@app.post("/api/photos/{photo_id}/reveal")
def reveal_photo(photo_id: int):
    import subprocess
    conn = get_connection()
    r = conn.execute("SELECT path FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r or not Path(r["path"]).is_file():
        return {"error": "file not found"}
    subprocess.Popen(["explorer", "/select,", r["path"]])
    return {"ok": True}


@app.post("/api/photos/{photo_id}/rate")
def rate_photo(photo_id: int, payload: dict):
    rating = payload.get("rating", 0)
    conn = get_connection()
    conn.execute("UPDATE photos SET rating = ? WHERE id = ?", (rating, photo_id))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/api/photos/{photo_id}/rotate")
def rotate_photo(photo_id: int, payload: dict):
    degrees = payload.get("degrees", 90)
    conn = get_connection()
    r = conn.execute("SELECT path, width, height FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r:
        return {"error": "not found"}

    from PIL import Image
    from backend.thumbnails import delete_thumbnails

    fpath = r["path"]
    try:
        original = Image.open(fpath)
        rotated = original.rotate(-degrees, expand=True)
        original.close()

        if rotated.mode == "RGBA" and fpath.lower().endswith((".jpg", ".jpeg")):
            rotated = rotated.convert("RGB")

        exif = rotated.getexif()
        ORIENTATION_TAG = 274
        if ORIENTATION_TAG in exif:
            exif[ORIENTATION_TAG] = 1
        rotated.info["exif"] = exif.tobytes()

        rotated.save(fpath, quality=95)
        new_w, new_h = rotated.size
        rotated.close()

        conn = get_connection()
        conn.execute("UPDATE photos SET width = ?, height = ? WHERE id = ?", (new_w, new_h, photo_id))
        conn.commit()
        conn.close()

        delete_thumbnails(fpath)
    except Exception as e:
        return {"error": str(e)}

    return {"ok": True, "width": new_w, "height": new_h}


@app.get("/api/photos/{photo_id}/thumb/{size}")
def get_thumbnail(photo_id: int, size: str):
    from backend.thumbnails import get_thumb_path, generate_thumbnail

    conn = get_connection()
    r = conn.execute("SELECT path FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r:
        return Response(status_code=404)

    thumb_path = get_thumb_path(r["path"], size)
    if not thumb_path.exists():
        thumb_path = generate_thumbnail(r["path"], size)
        if not thumb_path:
            return Response(status_code=404)

    resp = FileResponse(str(thumb_path), media_type="image/jpeg")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    if "etag" in resp.headers:
        del resp.headers["etag"]
    if "last-modified" in resp.headers:
        del resp.headers["last-modified"]
    return resp


@app.get("/api/photos/{photo_id}/raw")
def get_raw_photo(photo_id: int):
    conn = get_connection()
    r = conn.execute("SELECT path, mime_type FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r or not Path(r["path"]).is_file():
        return Response(status_code=404)
    return FileResponse(r["path"], media_type=r["mime_type"])


import os, subprocess, hashlib

VIDEO_CACHE_DIR = APP_DIR / "cache" / "video"
VIDEO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

_video_jobs = set()
_video_jobs_lock = threading.Lock()
_streamable_videos = set()


def _mp4_streamable(path: str) -> bool:
    """True if the moov atom comes before mdat (playable/seekable while streaming)."""
    try:
        with open(path, "rb") as f:
            offset = 0
            for _ in range(64):
                f.seek(offset)
                header = f.read(8)
                if len(header) < 8:
                    return False
                size = int.from_bytes(header[:4], "big")
                box = header[4:8]
                if box == b"moov":
                    return True
                if box == b"mdat":
                    return False
                if size == 1:
                    ext = f.read(8)
                    if len(ext) < 8:
                        return False
                    size = int.from_bytes(ext, "big")
                elif size <= 0:
                    return False
                offset += size
        return False
    except OSError:
        return False


def _has_rotation(path: str) -> bool:
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream_side_data=rotation", "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=10,
        )
        return bool((probe.stdout or "").strip())
    except Exception:
        return True


def _build_video_cache(tag: str, path: str, cached: Path):
    tmp = cached.with_name(cached.name + ".part")
    try:
        rotated = _has_rotation(path)
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
               "-i", path,
               "-map", "0:v:0", "-map", "0:a?"]
        if rotated:
            cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "18"]
        else:
            cmd += ["-c", "copy"]
        cmd += ["-c:a", "copy", "-movflags", "+faststart", str(tmp)]
        result = subprocess.run(cmd, timeout=300)
        if result.returncode == 0 and tmp.is_file() and tmp.stat().st_size > 0:
            os.replace(tmp, cached)
        elif tmp.is_file():
            tmp.unlink()
    except Exception:
        if tmp.is_file():
            try:
                tmp.unlink()
            except OSError:
                pass
    finally:
        with _video_jobs_lock:
            _video_jobs.discard(tag)


@app.get("/api/photos/{photo_id}/stream")
def stream_video(photo_id: int):
    conn = get_connection()
    r = conn.execute("SELECT path, mime_type, size FROM photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not r or not Path(r["path"]).is_file():
        return Response(status_code=404)
    path = r["path"]
    mime = r["mime_type"]
    if not mime or not mime.startswith("video/"):
        return FileResponse(path, media_type=mime)

    p = Path(path)

    # WebM streams natively — never copy.
    if p.suffix.lower() == ".webm":
        return FileResponse(p, media_type=mime)

    # MP4/MOV already streamable (moov before mdat) and unrotated: serve as-is, no cache copy.
    if p.suffix.lower() in (".mp4", ".mov"):
        if path in _streamable_videos:
            return FileResponse(p, media_type=mime)
        if _mp4_streamable(path) and not _has_rotation(path):
            _streamable_videos.add(path)
            return FileResponse(p, media_type=mime)

    tag = hashlib.md5(f"{path}:{r['size']}".encode()).hexdigest()[:12]
    cached = VIDEO_CACHE_DIR / f"{tag}.mp4"
    try:
        cache_ok = cached.is_file() and cached.stat().st_size > 0 and cached.stat().st_mtime >= p.stat().st_mtime
    except OSError:
        cache_ok = False
    if cache_ok:
        return FileResponse(cached, media_type="video/mp4")

    # Build the cache in background and serve the original right away so playback starts immediately.
    with _video_jobs_lock:
        if tag not in _video_jobs:
            _video_jobs.add(tag)
            threading.Thread(target=_build_video_cache, args=(tag, path, cached), daemon=True).start()
    return FileResponse(p, media_type=mime)


# ── Collections ──────────────────────────────────────────────────────────────

@app.get("/api/collections")
def list_collections(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("ph.", show_hidden, hidden_only)
    hidden = (" AND " + cond) if cond else ""
    rows = conn.execute(
        "WITH RECURSIVE path_cte(id, name, parent_id, path_str) AS ("
        "  SELECT id, name, parent_id, name FROM collections WHERE parent_id IS NULL "
        "  UNION ALL "
        "  SELECT c.id, c.name, c.parent_id, p.path_str || ' › ' || c.name "
        "  FROM collections c JOIN path_cte p ON c.parent_id = p.id"
        ") "
        "SELECT c.id, p.path_str as name, c.color, c.icon, c.parent_id, "
        "(SELECT COUNT(*) FROM photo_collections pc "
        "  JOIN photos ph ON ph.id = pc.photo_id "
        "  WHERE pc.collection_id = c.id" + hidden + ") as photo_count "
        "FROM collections c "
        "JOIN path_cte p ON c.id = p.id "
        "GROUP BY c.id ORDER BY p.path_str"
    ).fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "color": r["color"], "icon": r["icon"], "parent_id": r["parent_id"], "photo_count": r["photo_count"]} for r in rows]

def _aggregate_collection_items(conn, include_hidden=False, hidden_only=False):
    """Per-collection item counts + latest sample ids, aggregated over the whole subtree."""
    rows = conn.execute("SELECT id, parent_id FROM collections").fetchall()
    children = {}
    all_ids = []
    for r in rows:
        all_ids.append(r["id"])
        parent_key = r["parent_id"] if r["parent_id"] is not None else None
        children.setdefault(parent_key, []).append(r["id"])

    if include_hidden:
        excluded = set()
    elif hidden_only:
        excluded = set(r["id"] for r in conn.execute("SELECT id FROM photos WHERE is_hidden = 0"))
    else:
        excluded = set(r["id"] for r in conn.execute("SELECT id FROM photos WHERE is_hidden = 1"))

    direct = {}
    for r in conn.execute("SELECT collection_id, photo_id FROM photo_collections"):
        if r["photo_id"] in excluded:
            continue
        direct.setdefault(r["collection_id"], set()).add(r["photo_id"])

    memo = {}

    def subtree_ids(cid, visiting):
        if cid in memo:
            return memo[cid]
        if cid in visiting:
            return set()
        visiting.add(cid)
        ids = set(direct.get(cid, set()))
        for ch in children.get(cid, []):
            ids |= subtree_ids(ch, visiting)
        visiting.discard(cid)
        memo[cid] = ids
        return ids

    agg_count, agg_samples = {}, {}
    for cid in all_ids:
        ids = subtree_ids(cid, set())
        agg_count[cid] = len(ids)
        agg_samples[cid] = sorted(ids, reverse=True)[:4]
    return agg_count, agg_samples


@app.get("/api/collections/tree")
def list_collections_tree(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    rows = conn.execute(
        "SELECT c.id, c.name, c.color, c.icon, c.parent_id "
        "FROM collections c ORDER BY c.name"
    ).fetchall()
    agg_count, _ = _aggregate_collection_items(conn, include_hidden=show_hidden, hidden_only=hidden_only)
    conn.close()

    entries = {r["id"]: {"id": r["id"], "name": r["name"], "color": r["color"], "icon": r["icon"], "parent_id": r["parent_id"], "photo_count": agg_count.get(r["id"], 0), "children": []} for r in rows}
    roots = []

    for entry_id, entry in entries.items():
        parent_id = entry["parent_id"]
        if parent_id and parent_id in entries:
            entries[parent_id]["children"].append(entry)
        else:
            roots.append(entry)

    def _flatten(nodes, depth=0):
        result = []
        for n in nodes:
            result.append({
                "id": n["id"],
                "name": n["name"],
                "color": n["color"],
                "icon": n["icon"],
                "parent_id": n["parent_id"],
                "photo_count": n["photo_count"],
                "depth": depth,
                "has_children": len(n["children"]) > 0,
            })
            result.extend(_flatten(n["children"], depth + 1))
        return result

    return _flatten(roots)

@app.get("/api/collections/browse")
def browse_collections(parent_id: Optional[int] = None, show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()

    if parent_id is not None:
        rows = conn.execute(
            "SELECT c.id, c.name, c.color, c.icon "
            "FROM collections c "
            "WHERE c.parent_id = ? "
            "ORDER BY c.name",
            (parent_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT c.id, c.name, c.color, c.icon "
            "FROM collections c "
            "WHERE c.parent_id IS NULL "
            "ORDER BY c.name"
        ).fetchall()

    agg_count, agg_samples = _aggregate_collection_items(conn, include_hidden=show_hidden, hidden_only=hidden_only)
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"], "name": r["name"], "color": r["color"], "icon": r["icon"],
            "photo_count": agg_count.get(r["id"], 0), "sample_ids": agg_samples.get(r["id"], []),
        })
    return result

@app.post("/api/collections")
def create_collection(payload: dict):
    name = payload.get("name", "").strip()
    parent_id = payload.get("parent_id")
    color = payload.get("color")
    icon = payload.get("icon")
    if not name:
        return {"error": "name is required"}
    conn = get_connection()
    try:
        conn.execute("INSERT INTO collections (name, parent_id, color, icon) VALUES (?, ?, ?, ?)", (name, parent_id, color, icon))
        conn.commit()
        coll_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    except sqlite3.IntegrityError:
        return {"error": "collection already exists"}
    finally:
        conn.close()
    return {"ok": True, "id": coll_id}

@app.put("/api/collections/{collection_id}")
def update_collection(collection_id: int, payload: dict):
    name = payload.get("name", "").strip() if "name" in payload else None
    color = payload.get("color")
    icon = payload.get("icon")
    parent_id = payload.get("parent_id")

    conn = get_connection()
    try:
        if name is not None:
            conn.execute("UPDATE collections SET name = ? WHERE id = ?", (name, collection_id))
        if color is not None:
            conn.execute("UPDATE collections SET color = ? WHERE id = ?", (color, collection_id))
        if icon is not None:
            conn.execute("UPDATE collections SET icon = ? WHERE id = ?", (icon, collection_id))
        if "parent_id" in payload:
            conn.execute("UPDATE collections SET parent_id = ? WHERE id = ?", (parent_id, collection_id))
        conn.commit()
    except sqlite3.IntegrityError:
        return {"error": "collection name already exists at this level"}
    finally:
        conn.close()
    return {"ok": True}

@app.delete("/api/collections/{collection_id}")
def delete_collection(collection_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

# ── Photo Collections ────────────────────────────────────────────────────────

@app.get("/api/photos/{photo_id}/collections")
def photo_collections(photo_id: int):
    conn = get_connection()
    rows = conn.execute(
        "WITH RECURSIVE path_cte(id, name, parent_id, path_str) AS ("
        "  SELECT id, name, parent_id, name FROM collections WHERE parent_id IS NULL "
        "  UNION ALL "
        "  SELECT c.id, c.name, c.parent_id, p.path_str || ' › ' || c.name "
        "  FROM collections c JOIN path_cte p ON c.parent_id = p.id"
        ") "
        "SELECT c.id, p.path_str as name, c.color, c.icon FROM collections c "
        "JOIN path_cte p ON c.id = p.id "
        "JOIN photo_collections pc ON c.id = pc.collection_id "
        "WHERE pc.photo_id = ? ORDER BY p.path_str", (photo_id,)
    ).fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "color": r["color"], "icon": r["icon"]} for r in rows]

@app.post("/api/photos/{photo_id}/collections")
def add_collection_to_photo(photo_id: int, payload: dict):
    collection_id = payload.get("collection_id")
    if not collection_id:
        return {"error": "collection_id is required"}
    conn = get_connection()
    try:
        conn.execute("INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)", (photo_id, collection_id))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}

@app.delete("/api/photos/{photo_id}/collections/{collection_id}")
def remove_collection_from_photo(photo_id: int, collection_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM photo_collections WHERE photo_id = ? AND collection_id = ?", (photo_id, collection_id))
    conn.commit()
    conn.close()
    return {"ok": True}

# ── Tags ─────────────────────────────────────────────────────────────────────

@app.get("/api/tags")
def list_tags(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("ph.", show_hidden, hidden_only)
    hf = ("AND " + cond + " ") if cond else ""
    rows = conn.execute(
        "SELECT t.id, t.name, t.color, t.parent_id, "
        "(SELECT COUNT(*) FROM photo_tags pt JOIN photos ph ON ph.id = pt.photo_id "
        "  WHERE pt.tag_id = t.id " + hf + ") as photo_count "
        "FROM tags t GROUP BY t.id ORDER BY t.name"
    ).fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "color": r["color"], "parent_id": r["parent_id"], "photo_count": r["photo_count"]} for r in rows]


@app.get("/api/tags/browse")
def browse_tags(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("ph.", show_hidden, hidden_only)
    wh = ("WHERE " + cond + " ") if cond else ""
    hf2 = ("AND " + cond + " ") if cond else ""
    rows = conn.execute(
        "SELECT t.id, t.name, t.color, COUNT(pt.photo_id) as photo_count "
        "FROM tags t "
        "LEFT JOIN photo_tags pt ON t.id = pt.tag_id "
        "LEFT JOIN photos ph ON ph.id = pt.photo_id "
        + wh +
        "GROUP BY t.id HAVING COUNT(pt.photo_id) > 0 ORDER BY t.name"
    ).fetchall()
    result = []
    for r in rows:
        samples = [x["photo_id"] for x in conn.execute(
            "SELECT pt.photo_id FROM photo_tags pt JOIN photos ph ON ph.id = pt.photo_id "
            "WHERE pt.tag_id = ? " + hf2 + "ORDER BY pt.photo_id DESC LIMIT 4",
            (r["id"],)
        ).fetchall()]
        result.append({
            "id": r["id"], "name": r["name"], "color": r["color"],
            "photo_count": r["photo_count"], "sample_ids": samples,
        })
    conn.close()
    return result


@app.post("/api/tags")
def create_tag(payload: dict):
    name = payload.get("name", "").strip()
    parent_id = payload.get("parent_id")
    color = payload.get("color")
    if not name:
        return {"error": "name is required"}
    conn = get_connection()
    try:
        conn.execute("INSERT INTO tags (name, parent_id, color) VALUES (?, ?, ?)", (name, parent_id, color))
        conn.commit()
        tag_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    except sqlite3.IntegrityError:
        return {"error": "tag already exists"}
    finally:
        conn.close()
    return {"ok": True, "id": tag_id}


@app.put("/api/tags/{tag_id}")
def rename_tag(tag_id: int, payload: dict):
    name = payload.get("name", "").strip() if "name" in payload else None
    color = payload.get("color")
    conn = get_connection()
    try:
        if name is not None:
            conn.execute("UPDATE tags SET name = ? WHERE id = ?", (name, tag_id))
        if color is not None:
            conn.execute("UPDATE tags SET color = ? WHERE id = ?", (color, tag_id))
        conn.commit()
    except sqlite3.IntegrityError:
        return {"error": "tag name already exists"}
    finally:
        conn.close()
    return {"ok": True}


@app.delete("/api/tags/{tag_id}")
def delete_tag(tag_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Photo Tags ───────────────────────────────────────────────────────────────

@app.get("/api/photos/{photo_id}/tags")
def photo_tags(photo_id: int):
    conn = get_connection()
    rows = conn.execute(
        "SELECT t.id, t.name, t.color FROM tags t "
        "JOIN photo_tags pt ON t.id = pt.tag_id "
        "WHERE pt.photo_id = ? ORDER BY t.name", (photo_id,)
    ).fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "color": r["color"]} for r in rows]


@app.post("/api/photos/{photo_id}/tags")
def add_tag_to_photo(photo_id: int, payload: dict):
    tag_id = payload.get("tag_id")
    if not tag_id:
        return {"error": "tag_id is required"}
    conn = get_connection()
    try:
        conn.execute("INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)", (photo_id, tag_id))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@app.delete("/api/photos/{photo_id}/tags/{tag_id}")
def remove_tag_from_photo(photo_id: int, tag_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ?", (photo_id, tag_id))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Countries ───────────────────────────────────────────────────────────────

COUNTRY_NAMES = {
    "AF": "Afghanistan", "AL": "Albania", "DZ": "Algeria", "AD": "Andorra",
    "AO": "Angola", "AR": "Argentina", "AM": "Armenia", "AU": "Australia",
    "AT": "Austria", "AZ": "Azerbaijan", "BS": "Bahamas", "BH": "Bahrain",
    "BD": "Bangladesh", "BB": "Barbados", "BY": "Belarus", "BE": "Belgium",
    "BZ": "Belize", "BJ": "Benin", "BT": "Bhutan", "BO": "Bolivia",
    "BA": "Bosnia and Herzegovina", "BW": "Botswana", "BR": "Brazil",
    "BN": "Brunei", "BG": "Bulgaria", "BF": "Burkina Faso", "BI": "Burundi",
    "KH": "Cambodia", "CM": "Cameroon", "CA": "Canada", "CF": "Central African Republic",
    "TD": "Chad", "CL": "Chile", "CN": "China", "CO": "Colombia",
    "KM": "Comoros", "CG": "Congo", "CR": "Costa Rica", "HR": "Croatia",
    "CU": "Cuba", "CY": "Cyprus", "CZ": "Czech Republic", "DK": "Denmark",
    "DJ": "Djibouti", "DO": "Dominican Republic", "EC": "Ecuador", "EG": "Egypt",
    "SV": "El Salvador", "GQ": "Equatorial Guinea", "ER": "Eritrea", "EE": "Estonia",
    "ET": "Ethiopia", "FJ": "Fiji", "FI": "Finland", "FR": "France",
    "GA": "Gabon", "GM": "Gambia", "GE": "Georgia", "DE": "Germany",
    "GH": "Ghana", "GR": "Greece", "GT": "Guatemala", "GN": "Guinea",
    "GW": "Guinea-Bissau", "GY": "Guyana", "HT": "Haiti", "HN": "Honduras",
    "HK": "Hong Kong", "HU": "Hungary", "IS": "Iceland", "IN": "India",
    "ID": "Indonesia", "IR": "Iran", "IQ": "Iraq", "IE": "Ireland",
    "IL": "Israel", "IT": "Italy", "JM": "Jamaica", "JP": "Japan",
    "JO": "Jordan", "KZ": "Kazakhstan", "KE": "Kenya", "KI": "Kiribati",
    "KP": "North Korea", "KR": "South Korea", "KW": "Kuwait", "KG": "Kyrgyzstan",
    "LA": "Laos", "LV": "Latvia", "LB": "Lebanon", "LS": "Lesotho",
    "LR": "Liberia", "LY": "Libya", "LI": "Liechtenstein", "LT": "Lithuania",
    "LU": "Luxembourg", "MO": "Macao", "MK": "North Macedonia", "MG": "Madagascar",
    "MW": "Malawi", "MY": "Malaysia", "MV": "Maldives", "ML": "Mali",
    "MT": "Malta", "MH": "Marshall Islands", "MR": "Mauritania", "MU": "Mauritius",
    "MX": "Mexico", "FM": "Micronesia", "MD": "Moldova", "MC": "Monaco",
    "MN": "Mongolia", "ME": "Montenegro", "MA": "Morocco", "MZ": "Mozambique",
    "MM": "Myanmar", "NA": "Namibia", "NR": "Nauru", "NP": "Nepal",
    "NL": "Netherlands", "NZ": "New Zealand", "NI": "Nicaragua", "NE": "Niger",
    "NG": "Nigeria", "NO": "Norway", "OM": "Oman", "PK": "Pakistan",
    "PW": "Palau", "PA": "Panama", "PG": "Papua New Guinea", "PY": "Paraguay",
    "PE": "Peru", "PH": "Philippines", "PL": "Poland", "PT": "Portugal",
    "QA": "Qatar", "RO": "Romania", "RU": "Russia", "RW": "Rwanda",
    "KN": "Saint Kitts and Nevis", "LC": "Saint Lucia", "WS": "Samoa",
    "SM": "San Marino", "ST": "Sao Tome and Principe", "SA": "Saudi Arabia",
    "SN": "Senegal", "RS": "Serbia", "SC": "Seychelles", "SL": "Sierra Leone",
    "SG": "Singapore", "SK": "Slovakia", "SI": "Slovenia", "SB": "Solomon Islands",
    "SO": "Somalia", "ZA": "South Africa", "SS": "South Sudan", "ES": "Spain",
    "LK": "Sri Lanka", "SD": "Sudan", "SR": "Suriname", "SE": "Sweden",
    "CH": "Switzerland", "SY": "Syria", "TW": "Taiwan", "TJ": "Tajikistan",
    "TZ": "Tanzania", "TH": "Thailand", "TL": "Timor-Leste", "TG": "Togo",
    "TO": "Tonga", "TT": "Trinidad and Tobago", "TN": "Tunisia", "TR": "Turkey",
    "TM": "Turkmenistan", "TV": "Tuvalu", "UG": "Uganda", "UA": "Ukraine",
    "AE": "United Arab Emirates", "GB": "United Kingdom", "US": "United States",
    "UY": "Uruguay", "UZ": "Uzbekistan", "VU": "Vanuatu", "VE": "Venezuela",
    "VN": "Vietnam", "YE": "Yemen", "ZM": "Zambia", "ZW": "Zimbabwe",
}


@app.get("/api/countries")
def list_countries(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    conn.execute("PRAGMA group_concat_limit = 1000000")
    cond = _hidden_sql("", show_hidden, hidden_only)
    hf = ("AND " + cond + " ") if cond else ""
    rows = conn.execute(
        "SELECT country, COUNT(*) as photo_count, "
        "GROUP_CONCAT(id) as ids "
        "FROM photos WHERE country IS NOT NULL " + hf +
        "GROUP BY country ORDER BY country"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        ids = [int(x) for x in r["ids"].split(",")]
        result.append({
            "code": r["country"],
            "name": COUNTRY_NAMES.get(r["country"], r["country"]),
            "photo_count": r["photo_count"],
            "sample_ids": ids[:4],
        })
    return result


@app.get("/api/cameras/browse")
def browse_cameras(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("", show_hidden, hidden_only)
    hf = ("AND " + cond + " ") if cond else ""
    rows = conn.execute(
        "SELECT camera_model, COUNT(*) as photo_count, "
        "GROUP_CONCAT(id) as ids "
        "FROM photos WHERE camera_model IS NOT NULL " + hf +
        "GROUP BY camera_model ORDER BY photo_count DESC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        ids = [int(x) for x in r["ids"].split(",")]
        result.append({
            "name": r["camera_model"],
            "photo_count": r["photo_count"],
            "sample_ids": ids[:4],
        })
    return result


# ── Cleaning ──────────────────────────────────────────────────────────────

@app.post("/api/cleaning/analyze")
def cleaning_analyze():
    from backend.cleaning import start_analysis
    ok = start_analysis()
    return {"ok": ok, "message": "already running" if not ok else "started"}


@app.get("/api/cleaning/status")
def cleaning_status():
    from backend.cleaning import get_analysis_status
    return get_analysis_status()


@app.get("/api/cleaning/duplicates")
def cleaning_duplicates():
    from backend.cleaning import find_duplicate_groups
    conn = get_connection()
    groups = find_duplicate_groups(conn)
    conn.close()
    return {"groups": groups, "count": sum(len(g) for g in groups)}


@app.get("/api/cleaning/blurry")
def cleaning_blurry(threshold: float = 50):
    from backend.cleaning import find_blurry_photos
    conn = get_connection()
    photos = find_blurry_photos(conn, threshold)
    conn.close()
    return {"photos": photos, "count": len(photos)}


@app.get("/api/cleaning/similar")
def cleaning_similar(threshold: int = 10):
    from backend.cleaning import find_similar_groups
    conn = get_connection()
    groups = find_similar_groups(conn, threshold)
    conn.close()
    return {"groups": groups, "count": sum(len(g) for g in groups)}


@app.get("/api/cleaning/bad")
def cleaning_bad():
    from backend.cleaning import find_bad_photos
    conn = get_connection()
    photos = find_bad_photos(conn)
    conn.close()
    return {"photos": photos, "count": len(photos)}


@app.post("/api/cleaning/delete")
def cleaning_delete(payload: dict):
    ids = payload.get("ids", [])
    if not ids:
        return {"error": "ids required"}
    from backend.cleaning import delete_photos
    deleted = delete_photos(ids)
    return {"ok": True, "deleted": deleted}


# ── Stats ─────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(show_hidden: bool = False, hidden_only: bool = False):
    conn = get_connection()
    cond = _hidden_sql("", show_hidden, hidden_only)
    hf = ("WHERE " + cond + " ") if cond else ""
    hfa = ("AND " + cond + " ") if cond else ""
    hid = (cond + " AND ") if cond else ""

    total_photos = conn.execute("SELECT COUNT(*) FROM photos " + hf).fetchone()[0]
    total_size = conn.execute("SELECT COALESCE(SUM(size), 0) FROM photos " + hf).fetchone()[0]

    ext_rows = conn.execute(
        "SELECT extension, COUNT(*) as cnt, COALESCE(SUM(size), 0) as sz "
        "FROM photos " + hf + "GROUP BY extension ORDER BY cnt DESC"
    ).fetchall()
    formats = [{"ext": r["extension"], "count": r["cnt"], "size": r["sz"]} for r in ext_rows]

    geo_count = conn.execute(
        "SELECT COUNT(*) FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL " + hfa
    ).fetchone()[0]

    timeline_rows = conn.execute(
        "SELECT SUBSTR(date_taken, 1, 7) as month, COUNT(*) as cnt "
        "FROM photos WHERE date_taken IS NOT NULL " + hfa +
        "GROUP BY month ORDER BY month"
    ).fetchall()
    timeline = [{"month": r["month"], "count": r["cnt"]} for r in timeline_rows]

    country_rows = conn.execute(
        "SELECT country, COUNT(*) as cnt "
        "FROM photos WHERE country IS NOT NULL " + hfa +
        "GROUP BY country ORDER BY cnt DESC LIMIT 15"
    ).fetchall()
    countries = [
        {"code": r["country"], "name": COUNTRY_NAMES.get(r["country"], r["country"]), "count": r["cnt"]}
        for r in country_rows
    ]

    hid = (cond + " AND ") if cond else ""
    count_360 = conn.execute(
        "SELECT COUNT(*) FROM photos WHERE " + hid +
        "("
        " camera_model LIKE '%THETA%' OR "
        " camera_make LIKE '%THETA%' OR "
        " camera_model LIKE '%INSTA360%' OR "
        " camera_make LIKE '%INSTA360%' OR "
        " (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') OR "
        " (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05)"
        ")"
    ).fetchone()[0]

    conn.close()

    video_exts = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    video_formats = [f for f in formats if f["ext"].lower() in video_exts]
    video_count = sum(f["count"] for f in video_formats)

    return {
        "total_photos": total_photos,
        "total_size": total_size,
        "formats": formats,
        "geo_count": geo_count,
        "geo_total": total_photos,
        "count_360": count_360,
        "timeline": timeline,
        "countries": countries,
        "video_count": video_count,
    }


# ── Changelog ────────────────────────────────────────────────────────────────

CHANGELOG_PATH = resource_path("CHANGELOG.md")

_CHIP_MAP = {
    "ADD":    "chip-add",
    "FIX":    "chip-fix",
    "EDIT":   "chip-edit",
    "REMOVE": "chip-remove",
}


def _md_to_changelog_html(md: str) -> str:
    lines = md.strip().split("\n")
    html_parts = []
    in_list = False
    versions = []
    current = None

    for line in lines:
        stripped = line.rstrip()
        if stripped.startswith("## "):
            if in_list:
                current["content"].append("</ul>")
                in_list = False
            if current:
                versions.append(current)
            title = stripped[3:]
            # Group headers (e.g. "## v0.2.x") have no " — " date separator
            if " — " not in title:
                versions.append({"group": title})
                current = None
            else:
                current = {"title": title, "content": []}
        elif stripped.startswith("### "):
            if current is None:
                continue
            if in_list:
                current["content"].append("</ul>")
                in_list = False
            current["content"].append(f'<h5>{stripped[4:]}</h5>')
        elif stripped.startswith("- "):
            if not in_list:
                current["content"].append("<ul>")
                in_list = True
            content = stripped[2:]
            content = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', content)
            chip_match = re.match(r'\[(\w+)\]\s*(.*)', content)
            if chip_match:
                tag = chip_match.group(1).upper()
                text = chip_match.group(2)
                css_class = _CHIP_MAP.get(tag, "chip-default")
                content = f'<span class="cl-chip {css_class}">{tag}</span> {text}'
            current["content"].append(f"<li>{content}</li>")
        else:
            if in_list:
                current["content"].append("</ul>")
                in_list = False
    if in_list and current:
        current["content"].append("</ul>")
    if current:
        versions.append(current)

    version_index = 0
    for i, v in enumerate(versions):
        if "group" in v:
            html_parts.append(f'<div class="cl-group-header">{v["group"]}</div>')
            continue
        # open the first real version by default (skip group headers)
        open_attr = " open" if version_index == 0 else ""
        version_index += 1
        title_text = v["title"]
        # Split name from date: "v0.1.1 — β — 19 August 2026" → name + date
        parts = title_text.rsplit(" — ", 1)
        if len(parts) == 2:
            name_html = f'{parts[0]} <span class="cl-version-date">{parts[1]}</span>'
        else:
            name_html = title_text
        chevron = '<svg class="cl-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>'
        html_parts.append(f'<details class="cl-version"{open_attr}>')
        html_parts.append(f'<summary>{chevron}<span class="cl-version-title">{name_html}</span></summary>')
        html_parts.append('<div class="cl-version-body">')
        html_parts.extend(v["content"])
        html_parts.append('</div></details>')

    return "\n".join(html_parts)


@app.get("/api/changelog")
def get_changelog():
    if not CHANGELOG_PATH.exists():
        return {"html": "<p>No changelog available.</p>"}
    md = CHANGELOG_PATH.read_text(encoding="utf-8")
    return {"html": _md_to_changelog_html(md)}


# ── Update checker (GitHub releases) ─────────────────────────────────────────

GITHUB_REPO = "DarkAdrick/Photonic"
GITHUB_LATEST_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
RELEASES_PAGE_URL = f"https://github.com/{GITHUB_REPO}/releases"

_update_state = {
    "current_version": APP_VERSION,
    "latest_version": None,
    "update_available": False,
    "release_url": RELEASES_PAGE_URL,
    "release_name": None,
    "published_at": None,
    "checked_at": None,
    "error": None,
}

_update_lock = threading.Lock()


def _parse_version(s: str):
    """'v0.2.2' -> (0, 2, 2). Non-numeric parts are ignored."""
    parts = []
    for chunk in s.strip().lstrip("vV").split("."):
        digits = re.match(r"\d+", chunk)
        if not digits:
            break
        parts.append(int(digits.group()))
    return tuple(parts) if parts else (0,)


def _fetch_latest_release(timeout: float = 10.0) -> dict:
    req = urllib.request.Request(GITHUB_LATEST_URL, headers={
        "User-Agent": f"Photonic/{APP_VERSION}",
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return _json.loads(resp.read().decode("utf-8"))


def _fetch_latest_release_atom(timeout: float = 10.0) -> dict:
    """Fallback when the REST API is unavailable or rate-limited (shared IPs,
    VPN...): scrape the public releases.atom feed, which has no rate limit."""
    req = urllib.request.Request(f"{RELEASES_PAGE_URL}.atom", headers={
        "User-Agent": f"Photonic/{APP_VERSION}",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        feed = resp.read().decode("utf-8", errors="replace")
    entry = re.search(r"<entry>(.*?)</entry>", feed, re.S)
    if not entry:
        raise ValueError("no release in atom feed")
    block = entry.group(1)
    tag = re.search(r"<id>[^<]*?/([^/<]+)</id>", block)
    link = re.search(r'<link[^>]*rel="alternate"[^>]*href="([^"]+)"', block) \
        or re.search(r'<link[^>]*href="([^"]+)"', block)
    if not tag:
        raise ValueError("unparsable atom entry")
    return {
        "tag_name": tag.group(1),
        "html_url": link.group(1) if link else RELEASES_PAGE_URL,
    }


def _run_update_check():
    global _update_state
    from datetime import datetime, timezone
    try:
        try:
            data = _fetch_latest_release()
        except urllib.error.HTTPError as e:
            if e.code == 404:  # no releases published yet — not an error for the user
                new_state = {**_update_state, "latest_version": None, "update_available": False,
                             "checked_at": datetime.now(timezone.utc).isoformat(), "error": None}
                with _update_lock:
                    _update_state = new_state
                return
            data = _fetch_latest_release_atom()  # rate limit / API hiccup → atom feed
        except Exception:
            data = _fetch_latest_release_atom()  # network error → atom feed
        tag = data.get("tag_name") or data.get("name") or ""
        latest = _parse_version(tag)
        current = _parse_version(APP_VERSION)
        new_state = {
            "current_version": APP_VERSION,
            "latest_version": tag.lstrip("vV") or None,
            "update_available": latest > current,
            "release_url": data.get("html_url") or RELEASES_PAGE_URL,
            "release_name": data.get("name"),
            "published_at": data.get("published_at"),
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "error": None,
        }
    except urllib.error.HTTPError as e:
        new_state = {**_update_state, "error": f"GitHub HTTP {e.code}"}
    except Exception as e:
        new_state = {**_update_state, "error": str(e)}
    with _update_lock:
        _update_state = new_state


def _start_update_check(delay: float = 0.0):
    def _run():
        if delay:
            time.sleep(delay)
        _run_update_check()
    threading.Thread(target=_run, daemon=True).start()


@app.get("/api/update/status")
def update_status():
    with _update_lock:
        state = dict(_update_state)
        needs_check = state["checked_at"] is None
    if needs_check:  # first frontend load raced the startup thread — check now in background
        _start_update_check()
    return state


@app.post("/api/update/check")
def update_check():
    _run_update_check()
    with _update_lock:
        return dict(_update_state)


# ── Sponsors / credits (GitHub + local credits.json) ─────────────────────────

GITHUB_SPONSORS_URL = f"https://api.github.com/users/DarkAdrick/sponsors"

CREDITS_PATH = APP_DIR / "credits.json"      # user-editable override (.photonic/)
CREDITS_BUNDLED = resource_path("credits.json")  # shipped default / backup

_sponsors_state = {
    "github": [],
    "checked_at": None,
    "error": None,
}

_sponsors_lock = threading.Lock()


def _normalize_credit(entry) -> dict:
    """Accept either a plain string (""name") or an object
    ({"name", "reason", "url"}) and normalize into a consistent dict."""
    if isinstance(entry, str):
        name = entry.strip()
        return {"name": name, "reason": "", "url": ""}
    if isinstance(entry, dict):
        return {
            "name": (entry.get("name") or entry.get("login") or "").strip(),
            "reason": (entry.get("reason") or "").strip(),
            "url": (entry.get("url") or "").strip(),
        }
    return {"name": "", "reason": "", "url": ""}


def _read_local_credits() -> dict:
    """Merge the user-editable override on top of the bundled file. The
    override can add sponsors/thanks; both files use the same schema.
    Entries may be plain strings or objects with name/reason/url."""
    merged = {"sponsors": [], "thanks": []}
    for path in (CREDITS_BUNDLED, CREDITS_PATH):
        try:
            data = _json.loads(path.read_text(encoding="utf-8-sig"))  # tolerate a UTF-8 BOM
            merged["sponsors"].extend(_normalize_credit(e) for e in (data.get("sponsors") or []))
            merged["thanks"].extend(_normalize_credit(e) for e in (data.get("thanks") or []))
        except (OSError, ValueError):
            continue
    # de-duplicate by name, preserve order, drop entries without a name
    def _dedup(items):
        seen = set()
        out = []
        for it in items:
            key = it["name"].lower()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(it)
        return out
    merged["sponsors"] = _dedup(merged["sponsors"])
    merged["thanks"] = _dedup(merged["thanks"])
    return merged


def _fetch_sponsors(timeout: float = 10.0) -> list:
    """Fetch public sponsors (logins only). Only accounts that chose to show
    their sponsorship publicly are returned, so anonymous donors never appear."""
    page = 1
    names = []
    while True:
        req_url = urllib.request.Request(f"{GITHUB_SPONSORS_URL}?per_page=100&page={page}", headers={
            "User-Agent": f"Photonic/{APP_VERSION}",
            "Accept": "application/vnd.github+json",
        })
        with urllib.request.urlopen(req_url, timeout=timeout) as resp:
            data = _json.loads(resp.read().decode("utf-8"))
        if not data:
            break
        for user in data:
            login = user.get("login")
            if login:
                names.append(login)
        if len(data) < 100:
            break
        page += 1
    return names


def _run_sponsors_fetch():
    global _sponsors_state
    from datetime import datetime, timezone
    try:
        github = _fetch_sponsors()
    except urllib.error.HTTPError as e:
        github = []
        error = f"GitHub HTTP {e.code}"
    except Exception as e:
        github = []
        error = str(e)
    else:
        error = None
    with _sponsors_lock:
        _sponsors_state = {
            "github": github,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "error": error,
        }


@app.get("/api/sponsors")
def sponsors():
    # Local credits.json entries always return immediately (manual sponsors /
    # thanks must appear even offline or before the GitHub fetch completes).
    local = _read_local_credits()
    with _sponsors_lock:
        state = dict(_sponsors_state)
        fresh = state["checked_at"] is not None
    if not fresh:
        # kick off GitHub fetch in background, refresh on the next call
        def _run():
            _run_sponsors_fetch()
        threading.Thread(target=_run, daemon=True).start()
    # merge manual sponsors + cached public logins (as objects)
    github_objs = [_normalize_credit(l) for l in state["github"]]
    seen = set()
    sponsors_list = []
    for it in local["sponsors"] + github_objs:
        key = it["name"].lower()
        if not key or key in seen:
            continue
        seen.add(key)
        sponsors_list.append(it)
    return {
        "sponsors": sponsors_list,
        "thanks": local["thanks"],
        "checked_at": state["checked_at"],
        "error": state["error"],
    }


# ── Telemetry (anonymous launch ping, opt-out) ───────────────────────────────

TELEMETRY_URL = "https://thephoenixfactory.com/photonic/ping.php"

SETTINGS_PATH = APP_DIR / "settings.json"
INSTALL_ID_PATH = DB_DIR / "install_id"


def _read_settings() -> dict:
    try:
        return _json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write_settings(settings: dict) -> None:
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        SETTINGS_PATH.write_text(_json.dumps(settings, indent=2), encoding="utf-8")
    except OSError:
        pass


def _telemetry_enabled() -> bool:
    return bool(_read_settings().get("telemetry_enabled", True))


def _get_install_id() -> str:
    """Anonymous per-installation UUID persisted in .photonic/data/install_id."""
    try:
        existing = INSTALL_ID_PATH.read_text(encoding="utf-8").strip()
        if existing:
            return existing
    except OSError:
        pass
    install_id = str(uuid.uuid4())
    try:
        INSTALL_ID_PATH.parent.mkdir(parents=True, exist_ok=True)
        INSTALL_ID_PATH.write_text(install_id, encoding="utf-8")
    except OSError:
        pass
    return install_id


def _run_telemetry_ping():
    if not _telemetry_enabled():
        return
    try:
        os_name = {"darwin": "macos"}.get(platform.system().lower(), platform.system().lower())
        payload = _json.dumps({
            "install_id": _get_install_id(),
            "app_version": APP_VERSION,
            "os": os_name,
            "event": "launch",
        }).encode("utf-8")
        req = urllib.request.Request(TELEMETRY_URL, data=payload, headers={
            "User-Agent": f"Photonic/{APP_VERSION}",
            "Content-Type": "application/json",
        })
        with urllib.request.urlopen(req, timeout=5):
            pass
    except Exception:
        pass  # telemetry must never disturb the app


def _start_telemetry_ping(delay: float = 0.0):
    def _run():
        if delay:
            time.sleep(delay)
        _run_telemetry_ping()
    threading.Thread(target=_run, daemon=True).start()


@app.get("/api/settings/telemetry")
def get_telemetry_setting():
    return {"enabled": _telemetry_enabled()}


@app.post("/api/settings/telemetry")
def set_telemetry_setting(payload: dict):
    enabled = bool(payload.get("enabled", True))
    _write_settings({**_read_settings(), "telemetry_enabled": enabled})
    return {"enabled": enabled}


@app.get("/api/settings/language")
def get_language_setting():
    return {"language": _read_settings().get("language", "en-US")}


@app.post("/api/settings/language")
def set_language_setting(payload: dict):
    language = str(payload.get("language", "en-US") or "en-US")
    _write_settings({**_read_settings(), "language": language})
    return {"language": language}


# ── Static files & SPA fallback ──────────────────────────────────────────────

app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
app.mount("/i18n", StaticFiles(directory=str(FRONTEND_DIR / "i18n")), name="i18n")


@app.get("/{path:path}")
def serve_frontend(path: str):
    file = FRONTEND_DIR / path
    if not file.is_file():
        file = FRONTEND_DIR / "index.html"
    
    resp = FileResponse(str(file))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp
