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


def resource_path(name: str) -> Path:
    """Locate a bundled read-only resource (CHANGELOG.md, icon.png...).

    PyInstaller datas land in _MEIPASS/backend/, i.e. next to this package;
    in dev the file sits at the project root."""
    here = Path(__file__).resolve().parent
    for candidate in (here / name, here.parent / name):
        if candidate.exists():
            return candidate
    return here.parent / name
