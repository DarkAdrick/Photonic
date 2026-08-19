@echo off
echo ==========================================
echo   Photonic — Build (venv)
echo ==========================================
echo.

if not exist venv_build (
    echo Creating venv...
    python -m venv venv_build
)

echo Installing dependencies...
venv_build\Scripts\pip.exe install -r requirements.txt pyinstaller -q

echo Building Photonic.exe...
echo.

venv_build\Scripts\pyinstaller.exe ^
    --noconfirm ^
    --onefile ^
    --windowed ^
    --name Photonic ^
    --icon icon.ico ^
    --add-data "backend;backend" ^
    --add-data "frontend;frontend" ^
    --hidden-import backend.main ^
    --hidden-import backend.database ^
    --hidden-import backend.scanner ^
    --hidden-import backend.thumbnails ^
    run.py

if %errorlevel% neq 0 (
    echo.
    echo BUILD FAILED
    pause
    exit /b 1
)

echo.
echo BUILD OK — dist\Photonic.exe
echo.
pause
