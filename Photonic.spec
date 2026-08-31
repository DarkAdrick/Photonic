# -*- mode: python ; coding: utf-8 -*-

def _app_version():
    ns = {}
    with open('backend/version.py', 'r', encoding='utf-8') as f:
        exec(compile(f.read(), 'backend/version.py', 'exec'), ns)
    return ns.get('APP_VERSION', '0.0.0')


APP_VERSION = _app_version()


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=[],
    datas=[('backend', 'backend'), ('frontend', 'frontend'), ('venv_build/Lib/site-packages/reverse_geocoder/rg_cities1000.csv', '.'), ('CHANGELOG.md', 'backend'), ('credits.json', 'backend'), ('icon.png', 'backend')],
    hiddenimports=['backend.main', 'backend.database', 'backend.scanner', 'backend.thumbnails'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Photonic-v' + APP_VERSION,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['icon.ico'],
)
