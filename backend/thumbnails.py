import hashlib
import os
from pathlib import Path
from PIL import Image

from backend.paths import CACHE_DIR

SIZES = {
    "small":  (160, 160),
    "medium": (400, 400),
    "large":  (1024, 1024),
}


def _thumb_key(photo_path: str) -> str:
    return hashlib.md5(photo_path.encode("utf-8")).hexdigest()


def get_thumb_path(photo_path: str, size: str) -> Path:
    folder = CACHE_DIR / size
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{_thumb_key(photo_path)}.jpg"


def delete_thumbnails(photo_path: str):
    for size in SIZES:
        p = get_thumb_path(photo_path, size)
        if p.exists():
            p.unlink()


def generate_thumbnail(photo_path: str, size: str = "medium") -> Path:
    thumb_path = get_thumb_path(photo_path, size)

    if thumb_path.exists():
        return thumb_path

    max_size = SIZES.get(size, SIZES["medium"])
    try:
        img = Image.open(photo_path)
        img.thumbnail(max_size, Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(thumb_path, "JPEG", quality=85)
        img.close()
    except Exception as e:
        print(f"[thumb] fail {photo_path}: {e}")
        return None

    return thumb_path


def generate_all_thumbnails(photo_path: str):
    for size in SIZES:
        generate_thumbnail(photo_path, size)
