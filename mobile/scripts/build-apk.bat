@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==========================================================
echo   Build Android APK - Photonic
echo ==========================================================
echo(

rem --- 1. Verifier Node / npm -----------------------------------------
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm introuvable. Installez Node.js puis relancez.
    pause
    exit /b 1
)

rem --- 2. Verifier JAVA_HOME (JDK 21 requis par Capacitor 7). ---------
rem        Fallback automatique sur le chemin connu si non definit.
if "%JAVA_HOME%"=="" (
    if exist "C:\devtools\jdk-21.0.12.1+1\bin\java.exe" set "JAVA_HOME=C:\devtools\jdk-21.0.12.1+1"
)
if "%JAVA_HOME%"=="" (
    echo [ERREUR] JAVA_HOME non defini. Pointez-le vers un JDK 21+
    echo ex:  setx JAVA_HOME "C:\devtools\jdk-21.0.12.1+1"
    pause
    exit /b 1
)

rem --- 3. Verifier ANDROID_HOME / ANDROID_SDK_ROOT ----------------------
rem        Fallback automatique sur le chemin connu si non defini.
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    if exist "C:\Android\Sdk\platform-tools\adb.exe" set "ANDROID_HOME=C:\Android\Sdk"
)
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    echo [ERREUR] ANDROID_HOME non defini (repertoire du Android SDK).
    pause
    exit /b 1
)

echo Installation des dependances npm (si besoin)...
if not exist node_modules (
    call npm.cmd install
    if errorlevel 1 ( echo [ERREUR] npm install a echoue. & pause & exit /b 1 )
)

echo Generation de www/ depuis src-www + frontend ...
call node scripts\sync-www.js
if errorlevel 1 ( echo [ERREUR] sync-www a echoue. & pause & exit /b 1 )

echo Copie des assets vers le projet Android...
call npx.cmd cap copy android
if errorlevel 1 ( echo [ERREUR] cap copy android a echoue. & pause & exit /b 1 )

echo Compilation APK (assembleDebug)...
pushd android
call gradlew.bat :app:assembleDebug --no-daemon
set GRADLE_RC=%errorlevel%
popd

if not %GRADLE_RC%==0 (
    echo(
    echo [ERREUR] BUILD Gradle FAILED.
    pause
    exit /b 1
)

set APK=android\app\build\outputs\apk\debug\app-debug.apk
echo(
echo ==========================================================
echo   BUILD OK
echo   APK : %~dp0..\%APK%
echo ==========================================================
echo(
pause
endlocal
exit /b 0
