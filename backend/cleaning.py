import os
import json
import hashlib
import struct
import threading
from pathlib import Path
from PIL import Image, ImageFilter

_ANALYSIS_STATE = {
    "running": False,
    "done": 0,
    "total": 0,
    "phase": "",
}


def get_analysis_status():
    return dict(_ANALYSIS_STATE)


# ── Per-photo analysis ────────────────────────────────────────────────────

def compute_blur_score(path: str) -> float:
    try:
        img = Image.open(path)
        img = img.convert("L")
        w, h = img.size
        scale = min(1.0, 400 / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.BILINEAR)
        edges = img.filter(ImageFilter.Kernel(
            size=(3, 3),
            kernel=[-1, -1, -1, -1, 8, -1, -1, -1, -1],
            scale=1, offset=0,
        ))
        data = list(edges.getdata())
        n = len(data)
        if n == 0:
            return 0.0
        mean = sum(data) / n
        variance = sum((x - mean) ** 2 for x in data) / n
        img.close()
        edges.close()
        return round(variance, 2)
    except Exception:
        return 0.0


def compute_dhash(path: str) -> str:
    try:
        img = Image.open(path)
        img = img.convert("L").resize((9, 8), Image.BILINEAR)
        pixels = list(img.getdata())
        img.close()
        bits = 0
        for row in range(8):
            for col in range(8):
                left = pixels[row * 9 + col]
                right = pixels[row * 9 + col + 1]
                bits = (bits << 1) | (1 if left > right else 0)
        return format(bits, "016x")
    except Exception:
        return ""


def hamming_distance(h1: str, h2: str) -> int:
    try:
        v1 = int(h1, 16)
        v2 = int(h2, 16)
        xor = v1 ^ v2
        count = 0
        while xor:
            count += xor & 1
            xor >>= 1
        return count
    except Exception:
        return 64


def compute_quality_flags(path: str) -> dict:
    flags = {"is_black": False, "is_white": False, "is_underexposed": False, "is_overexposed": False}
    try:
        img = Image.open(path)
        img = img.convert("L")
        w, h = img.size
        scale = min(1.0, 400 / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.BILINEAR)
        hist = img.histogram()
        img.close()
        total = sum(hist)
        if total == 0:
            return flags
        black_count = sum(hist[:10])
        white_count = sum(hist[246:])
        mean = sum(i * c for i, c in enumerate(hist)) / total
        if black_count / total > 0.95:
            flags["is_black"] = True
        elif white_count / total > 0.95:
            flags["is_white"] = True
        elif mean < 30:
            flags["is_underexposed"] = True
        elif mean > 225:
            flags["is_overexposed"] = True
    except Exception:
        pass
    return flags


# ── Bulk analysis ─────────────────────────────────────────────────────────

def analyze_all(progress_callback=None):
    from backend.database import get_connection

    _ANALYSIS_STATE["running"] = True
    _ANALYSIS_STATE["done"] = 0
    _ANALYSIS_STATE["phase"] = "Counting photos..."

    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM photos").fetchone()[0]
    rows = conn.execute(
        "SELECT id, path, perceptual_hash, blur_score, quality_flags "
        "FROM photos ORDER BY id"
    ).fetchall()
    conn.close()

    _ANALYSIS_STATE["total"] = total
    to_analyze = [r for r in rows if not r["blur_score"] or not r["quality_flags"]]
    total_work = len(to_analyze)
    _ANALYSIS_STATE["total"] = total_work
    _ANALYSIS_STATE["phase"] = f"Analyzing {total_work} photos..."

    conn = get_connection()
    done = 0
    for r in to_analyze:
        photo_id = r["id"]
        path = r["path"]

        if not os.path.isfile(path):
            done += 1
            continue

        blur = compute_blur_score(path)
        qflags = compute_quality_flags(path)
        dhash = r["perceptual_hash"] or compute_dhash(path)

        conn.execute(
            "UPDATE photos SET blur_score = ?, quality_flags = ?, perceptual_hash = ? WHERE id = ?",
            (blur, json.dumps(qflags), dhash, photo_id),
        )
        conn.commit()

        done += 1
        _ANALYSIS_STATE["done"] = done
        if progress_callback:
            progress_callback(done, total_work)

    conn.close()
    _ANALYSIS_STATE["running"] = False
    _ANALYSIS_STATE["phase"] = "Done"


def start_analysis():
    if _ANALYSIS_STATE["running"]:
        return False
    threading.Thread(target=analyze_all, daemon=True).start()
    return True


# ── Query helpers ─────────────────────────────────────────────────────────

def find_duplicate_groups(conn):
    rows = conn.execute(
        "SELECT id, filename, path, hash, size, width, height, date_taken "
        "FROM photos WHERE hash IS NOT NULL AND hash != '' "
        "ORDER BY hash, date_taken"
    ).fetchall()
    groups = {}
    for r in rows:
        h = r["hash"]
        if h not in groups:
            groups[h] = []
        groups[h].append(dict(r))
    return [g for g in groups.values() if len(g) > 1]


def find_blurry_photos(conn, threshold=50):
    rows = conn.execute(
        "SELECT id, filename, path, blur_score, width, height, date_taken "
        "FROM photos WHERE blur_score IS NOT NULL AND blur_score < ? "
        "ORDER BY blur_score ASC",
        (threshold,),
    ).fetchall()
    return [dict(r) for r in rows]


def find_similar_groups(conn, threshold=10):
    rows = conn.execute(
        "SELECT id, filename, path, perceptual_hash, size, width, height, date_taken "
        "FROM photos WHERE perceptual_hash IS NOT NULL AND perceptual_hash != '' "
        "ORDER BY perceptual_hash"
    ).fetchall()
    photos = [dict(r) for r in rows]
    visited = set()
    groups = []
    for i, p in enumerate(photos):
        if i in visited:
            continue
        group = [p]
        visited.add(i)
        for j in range(i + 1, len(photos)):
            if j in visited:
                continue
            if hamming_distance(p["perceptual_hash"], photos[j]["perceptual_hash"]) <= threshold:
                group.append(photos[j])
                visited.add(j)
        if len(group) > 1:
            groups.append(group)
    return groups


def find_bad_photos(conn):
    rows = conn.execute(
        "SELECT id, filename, path, quality_flags, width, height, date_taken "
        "FROM photos WHERE quality_flags IS NOT NULL AND quality_flags != '' "
        "ORDER BY filename"
    ).fetchall()
    bad = []
    for r in rows:
        flags = json.loads(r["quality_flags"])
        if any(flags.values()):
            entry = dict(r)
            entry["flags"] = flags
            bad.append(entry)
    return bad


def delete_photos(photo_ids: list):
    from backend.database import get_connection
    from backend.thumbnails import delete_thumbnails

    conn = get_connection()
    deleted = 0
    for pid in photo_ids:
        row = conn.execute("SELECT path FROM photos WHERE id = ?", (pid,)).fetchone()
        if not row:
            continue
        path = row["path"]
        try:
            if os.path.isfile(path):
                os.remove(path)
        except Exception:
            pass
        delete_thumbnails(path)
        conn.execute("DELETE FROM photo_tags WHERE photo_id = ?", (pid,))
        conn.execute("DELETE FROM _thumb_done WHERE photo_id = ?", (pid,))
        conn.execute("DELETE FROM photos WHERE id = ?", (pid,))
        deleted += 1
    conn.commit()
    conn.close()
    return deleted
