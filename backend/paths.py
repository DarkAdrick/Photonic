import sys
from pathlib import Path


def _base_dir() -> Path:
    """When frozen (PyInstaller --onefile), sys.executable is the .exe location.
    Otherwise fall back to the project root (parent of backend/)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


APP_DIR = _base_dir() / ".photonic"
DB_DIR = APP_DIR / "data"
DB_PATH = DB_DIR / "photonic.db"
CACHE_DIR = APP_DIR / "cache" / "thumbnails"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
