import hashlib
import os
import sys
import contextlib
from pathlib import Path
from PIL import Image

from backend.paths import CACHE_DIR, resource_path

SIZES = {
    "small":  (160, 160),
    "medium": (400, 400),
    "large":  (1024, 1024),
}

ICON_PATH = resource_path("icon.png")

# Videos that failed frame extraction — never re-probed (avoids FFmpeg spam + CPU waste)
_failed_videos = set()


@contextlib.contextmanager
def silence_ffmpeg():
    """Silence native FFmpeg/FFprobe output written directly to fd 2."""
    if os.name != "nt" or not sys.stderr:
        yield
        return
    try:
        fd = sys.stderr.fileno()
        saved = os.dup(fd)
    except (AttributeError, OSError, ValueError):
        # Console/pipe handles that cannot be duplicated (e.g. WinError 1)
        yield
        return
    devnull = None
    redirected = False
    try:
        devnull = os.open(os.devnull, os.O_WRONLY)
        sys.stderr.flush()
        os.dup2(devnull, fd)
        redirected = True
    except OSError:
        pass
    try:
        yield
    finally:
        if redirected:
            try:
                sys.stderr.flush()
                os.dup2(saved, fd)
            except OSError:
                pass
        if devnull is not None:
            os.close(devnull)
        os.close(saved)


def _thumb_key(photo_path: str) -> str:
    return hashlib.md5(photo_path.encode("utf-8")).hexdigest()


def get_thumb_path(photo_path: str, size: str) -> Path:
    folder = CACHE_DIR / size
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{_thumb_key(photo_path)}.jpg"


def delete_thumbnails(photo_path: str):
    _failed_videos.discard(photo_path)
    for size in SIZES:
        p = get_thumb_path(photo_path, size)
        if p.exists():
            p.unlink()


def generate_thumbnail(photo_path: str, size: str = "medium") -> Path:
    thumb_path = get_thumb_path(photo_path, size)

    if thumb_path.exists():
        return thumb_path

    max_size = SIZES.get(size, SIZES["medium"])
    is_video = Path(photo_path).suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}

    img = None
    if is_video:
        if photo_path in _failed_videos:
            return None
        try:
            import cv2
            with silence_ffmpeg():
                cap = cv2.VideoCapture(photo_path)
                success, frame = cap.read()
                if success:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(frame_rgb)
                cap.release()
        except Exception as e:
            print(f"[thumb] video frame extract fail, using fallback: {e}")

        if img is None:
            # Broken/unreadable video (e.g. missing moov atom): remember it
            _failed_videos.add(photo_path)
            # Fallback to project icon
            fallback_path = ICON_PATH
            if fallback_path.is_file():
                try:
                    img = Image.open(str(fallback_path))
                except Exception:
                    pass
    else:
        try:
            img = Image.open(photo_path)
        except Exception as e:
            print(f"[thumb] Image open fail {photo_path}: {e}")
            return None

    if img is None:
        return None

    try:
        img.thumbnail(max_size, Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(thumb_path, "JPEG", quality=85)
        img.close()
    except Exception as e:
        print(f"[thumb] save fail {photo_path}: {e}")
        return None

    return thumb_path


def generate_all_thumbnails(photo_path: str):
    for size in SIZES:
        generate_thumbnail(photo_path, size)
