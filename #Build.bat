@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Photonic - Build (venv)
echo ==========================================
echo.

rem --- 1. Python doit etre installe sur la machine
where python >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Python introuvable dans le PATH.
    echo Installez Python 3.x depuis https://www.python.org puis relancez.
    pause
    exit /b 1
)

rem --- 2. Un venv n'est PAS portable : s'il a ete copie/deplace, ses
rem        executables pointent vers un chemin obsolete. On le teste,
rem        et on le reconstruit si besoin.
set VENV_OK=0
if exist venv_build\Scripts\python.exe (
    venv_build\Scripts\python.exe -c "import sys" >nul 2>nul && set VENV_OK=1
)

if not %VENV_OK%==1 (
    if exist venv_build (
        echo Ancien venv invalide ou deplace : reconstruction...
        rmdir /s /q venv_build
    )
    echo Creation du venv...
    python -m venv venv_build
    if errorlevel 1 (
        echo.
        echo [ERREUR] Impossible de creer le venv.
        pause
        exit /b 1
    )
    rem On utilise "python.exe -m pip" plutot que pip.exe :
    rem les .exe du venv embarquent un chemin absolu qui casse
    rem si le dossier est deplace — pas le module.
)

echo Installation des dependances...
venv_build\Scripts\python.exe -m pip install --upgrade pip -q
venv_build\Scripts\python.exe -m pip install -r requirements.txt pyinstaller -q
if errorlevel 1 (
    echo.
    echo BUILD FAILED - dependances
    pause
    exit /b 1
)

echo Building Photonic.exe...
echo.

rem --- 3. Idem pour PyInstaller : on passe par le module, pas par l'exe
venv_build\Scripts\python.exe -m PyInstaller ^
    --noconfirm ^
    --onefile ^
    --windowed ^
    --name Photonic ^
    --icon icon.ico ^
    --add-data "backend;backend" ^
    --add-data "frontend;frontend" ^
    --add-data "venv_build\Lib\site-packages\reverse_geocoder\rg_cities1000.csv;." ^
    --add-data "CHANGELOG.md;backend" ^
    --add-data "icon.png;backend" ^
    --hidden-import backend.main ^
    --hidden-import backend.database ^
    --hidden-import backend.scanner ^
    --hidden-import backend.thumbnails ^
    run.py

if errorlevel 1 (
    echo.
    echo BUILD FAILED
    pause
    exit /b 1
)

echo.
echo BUILD OK - dist\Photonic.exe
echo.
pause
