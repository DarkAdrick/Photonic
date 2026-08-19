import os
import hashlib
import sqlite3
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif"}


def count_files(folder_path: str) -> int:
    count = 0
    for root, _, filenames in os.walk(folder_path):
        for fn in filenames:
            if Path(fn).suffix.lower() in EXTENSIONS:
                count += 1
    return count


def scan_folder(folder_path: str, progress_callback=None):
    folder = Path(folder_path)
    if not folder.is_dir():
        return

    from backend.database import get_connection
    conn = get_connection()

    # Remove photos that no longer exist on disk
    from backend.thumbnails import delete_thumbnails
    existing = conn.execute("SELECT id, path FROM photos WHERE path LIKE ?", (folder_path + "%",)).fetchall()
    for row in existing:
        if not os.path.isfile(row["path"]):
            conn.execute("DELETE FROM photo_tags WHERE photo_id = ?", (row["id"],))
            conn.execute("DELETE FROM _thumb_done WHERE photo_id = ?", (row["id"],))
            conn.execute("DELETE FROM photos WHERE id = ?", (row["id"],))
            delete_thumbnails(row["path"])
    conn.commit()

    files = []
    for root, _, filenames in os.walk(folder):
        for fn in filenames:
            if Path(fn).suffix.lower() in EXTENSIONS:
                files.append(os.path.join(root, fn))

    total = len(files)

    indexed = 0
    skipped = 0
    for i, fpath in enumerate(files):
        result = _index_file(conn, fpath)
        if result == "ok":
            indexed += 1
        else:
            skipped += 1

        conn.commit()

        if progress_callback:
            progress_callback(i + 1, total, indexed, skipped)

    conn.close()
    return {"total": total, "indexed": indexed, "skipped": skipped}


def _index_file(conn: sqlite3.Connection, fpath: str) -> str:
    existing = conn.execute("SELECT id FROM photos WHERE path = ?", (fpath,)).fetchone()
    if existing:
        return "skip"

    stat = os.stat(fpath)
    p = Path(fpath)

    width = height = None
    mime_type = None
    orientation = None
    camera_make = camera_model = lens = None
    focal_length = aperture = shutter_speed = None
    iso = date_taken = None
    latitude = longitude = None
    country = city = None

    try:
        img = Image.open(fpath)
        width, height = img.size
        mime_type = Image.MIME.get(img.format, "image/" + img.format.lower() if img.format else None)
        exif_data = img._getexif() if hasattr(img, "_getexif") else None
        if exif_data:
            exif = {}
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, tag_id)
                exif[tag_name] = value
            camera_make = _safe(exif.get("Make"))
            camera_model = _safe(exif.get("Model"))
            lens = _safe(exif.get("LensModel"))
            orientation = exif.get("Orientation")
            iso = _int(exif.get("ISOSpeedRatings"))
            date_taken = _safe(exif.get("DateTimeOriginal"))

            fl = exif.get("FocalLength")
            if fl:
                focal_length = str(fl)
            ap = exif.get("FNumber")
            if ap:
                aperture = str(ap)
            ss = exif.get("ExposureTime")
            if ss:
                shutter_speed = str(ss)

            gps = exif.get("GPSInfo")
            if gps:
                gps_decoded = {}
                for k, v in gps.items():
                    tag_name = GPSTAGS.get(k, k)
                    gps_decoded[tag_name] = v
                lat = gps_decoded.get("GPSLatitude")
                lat_ref = gps_decoded.get("GPSLatitudeRef")
                lon = gps_decoded.get("GPSLongitude")
                lon_ref = gps_decoded.get("GPSLongitudeRef")
                if lat and lon:
                    latitude = _gps_to_decimal(lat, lat_ref)
                    longitude = _gps_to_decimal(lon, lon_ref)
                    if latitude is not None and longitude is not None:
                        try:
                            import reverse_geocoder as rg
                            result = rg.search((latitude, longitude))
                            if result:
                                country = result[0].get("cc")
                                city = result[0].get("name")
                        except Exception:
                            pass
        img.close()
    except Exception:
        pass

    file_hash = _file_hash(fpath)

    conn.execute("""
        INSERT OR IGNORE INTO photos
        (path, filename, extension, size, modified_date, created_date,
         width, height, mime_type, camera_make, camera_model, lens,
         focal_length, aperture, shutter_speed, iso, date_taken,
         latitude, longitude, orientation, hash, country, city)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        fpath, p.name, p.suffix.lower(), stat.st_size,
        str(stat.st_mtime), str(stat.st_ctime),
        width, height, mime_type,
        camera_make, camera_model, lens,
        focal_length, aperture, shutter_speed, iso, date_taken,
        latitude, longitude, orientation, file_hash, country, city,
    ))
    return "ok"


def _file_hash(fpath: str) -> str:
    h = hashlib.md5()
    try:
        with open(fpath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
    except Exception:
        return ""
    return h.hexdigest()


def _safe(v):
    if v is None:
        return None
    return str(v).strip()


def _int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _gps_to_decimal(coords, ref):
    try:
        d = float(coords[0])
        m = float(coords[1])
        s = float(coords[2])
        decimal = d + m / 60 + s / 3600
        if ref in ("S", "W"):
            decimal = -decimal
        return decimal
    except Exception:
        return None
