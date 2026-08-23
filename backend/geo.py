import sys
from pathlib import Path

_rg = None


def search(coords):
    """Reverse geocoding en mode mono-processus (mode=1, cKDTree scipy).

    Ne JAMAIS utiliser rg.search() par défaut (mode=2 / cKDTree_MP) dans
    l'exe gelé : il fait multiprocessing.Process(...).start() avec
    cpu_count() processus À CHAQUE requête. Sous PyInstaller sans
    freeze_support(), chaque enfant relance tout Photonic.exe (nouveau
    serveur + nouveau scan) => bombe fourchette, RAM/pagefile épuisés."""
    global _rg
    if not isinstance(coords, tuple) and not isinstance(coords, list):
        raise TypeError("Expecting a tuple or a tuple/list of tuples")
    if not isinstance(coords[0], tuple):
        coords = [coords]
    if _rg is None:
        import reverse_geocoder as rg_lib
        configure_reverse_geocoder()
        _rg = rg_lib.RGeocoder(mode=1, verbose=False)
    return _rg.query(coords)


def configure_reverse_geocoder() -> None:
    """reverse_geocoder telecharge les dumps GeoNames (cities1000.zip,
    admin1CodesASCII.txt, admin2Codes.txt) dans le repertoire courant si son
    CSV formate est introuvable — ce qui pollue le dossier de l'exe et casse
    hors-ligne. On pointe la lib (chemin absolu, voir rel_path() de la lib)
    sur la copie embarquee pour ne jamais rien telecharger ni ecrire."""
    import reverse_geocoder as rg

    if getattr(sys, "frozen", False):
        rg_file = Path(sys._MEIPASS) / "rg_cities1000.csv"
    else:
        rg_file = Path(rg.__file__).resolve().parent / "rg_cities1000.csv"
    if rg_file.exists():
        rg.RG_FILE = str(rg_file)
