@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==========================================================
echo   Launch mobile - Photonic (Android)
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
echo Recherche d'un appareil Android connecte...
set FOUND=0
"%ADB%" devices 2>nul | findstr /r "device$" >nul && set FOUND=1
if not %FOUND%==1 (
    echo.
    echo Aucun appareil / emulateur connecte - ou non autorise.
    echo.
    echo --- Diagnostique adb devices ---
    "%ADB%" devices
    echo --------------------------------
    echo - Demarrez un emulateur Android Studio  AVD,
    echo - OU branchez un tele en mode debugging USB.
    pause
    exit /b 1
)
echo Detecte : 
"%ADB%" devices 2>nul | findstr /r "device$"

rem --- 3. S'assurer que l'APK existe (build si besoin) ---------------
set APK=android\app\build\outputs\apk\debug\app-debug.apk
if not exist "%APK%" (
    echo APK absent - construction en cours...
    call scripts\build-apk.bat
    if errorlevel 1 exit /b 1
)

echo.
echo Installation de l'APK...
"%ADB%" install -r "%APK%"
if errorlevel 1 (
    echo [ERREUR] install a echoue.
    pause
    exit /b 1
)

rem --- 4. Permissions photos (API 33+) --------------------------------
echo Grant des permissions photos/videos...
"%ADB%" shell pm grant com.phoenixfactory.photonic android.permission.READ_MEDIA_IMAGES >nul 2>nul
"%ADB%" shell pm grant com.phoenixfactory.photonic android.permission.READ_MEDIA_VIDEO >nul 2>nul

echo.
echo Lancement de l'application...
"%ADB%" shell monkey -p com.phoenixfactory.photonic 1 >nul 2>nul
if errorlevel 1 "%ADB%" shell am start -n com.phoenixfactory.photonic/.MainActivity >nul 2>nul

echo.
echo Application lancee sur l'appareil.
echo Pour voir les logs :  %ADB% logcat -s Chromium:I Capacitor:V
echo.
pause
endlocal
exit /b 0
