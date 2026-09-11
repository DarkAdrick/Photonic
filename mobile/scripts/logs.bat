@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==========================================================
echo   Logs PhotonicScan - mobile (Android)
echo ==========================================================
echo.

rem --- 1. Verifier adb ------------------------------------------------
rem        Fallback automatique sur le chemin connu si ANDROID_HOME non defini.
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    if exist "C:\Android\Sdk\platform-tools\adb.exe" set "ANDROID_HOME=C:\Android\Sdk"
)
set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
if not exist "%ADB%" (
    echo [ERREUR] adb introuvable dans "%ADB%"
    pause
    exit /b 1
)

rem --- 2. Chercher un appareil / emulateur ---------------------------
set FOUND=0
"%ADB%" devices 2>nul | findstr /r "device$" >nul && set FOUND=1
if not %FOUND%==1 (
    echo Aucun appareil / emulateur connecte.
    "%ADB%" devices
    pause
    exit /b 1
)

rem --- 3. Afficher les logs -------------------------------------------
echo Lecture en direct des logs PhotonicScan (Ctrl+C pour quitter).
echo.
"%ADB%" logcat -s PhotonicScan

endlocal
exit /b 0