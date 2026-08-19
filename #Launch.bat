@echo off
echo ==========================================
echo   Photonic — Launch
echo ==========================================
echo.
echo Killing any existing server on port 8765...
powershell -Command "Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul
python run.py
