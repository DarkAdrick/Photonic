@echo off
echo ==========================================
echo   Photonic — Launch
echo ==========================================
echo.
echo Killing any existing server on port 8765...
powershell -Command "Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

if not exist venv_build (
    echo Creating virtual environment...
    python -m venv venv_build
)

echo Checking and installing dependencies (python -m pip)...
venv_build\Scripts\python.exe -m pip install -r requirements.txt -q

echo Launching Photonic...
venv_build\Scripts\python.exe run.py
