@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Photonic - Menu Build / Launch

:menu
cls
echo ==========================================================
echo    PHOTONIC - Build and Launch menu
echo ==========================================================
echo.
echo    [1]  Build desktop  (Photonic.exe  - PyInstaller)
echo    [2]  Build mobile   (Photonic.apk  - Android)
echo    [3]  Launch desktop (version Web  - run.py)
echo    [4]  Launch mobile  (Android app   - emulateur/appareil)
echo.
echo    [Q]  Quitter
echo.
set /p "CHOIX=Choisissez une option puis Entree : "

if /i "%CHOIX%"=="1" goto build_desktop
if /i "%CHOIX%"=="2" goto build_mobile
if /i "%CHOIX%"=="3" goto launch_desktop
if /i "%CHOIX%"=="4" goto launch_mobile
if /i "%CHOIX%"=="q" goto quit
goto menu

:build_desktop
echo.
echo Lancement du build desktop (.exe)...
call "#Build.bat"
goto after_build

:build_mobile
echo.
echo Construction de l'APK Android...
call mobile\scripts\build-apk.bat
goto after_build

:launch_desktop
echo.
echo Lancement de la version desktop (Web)...
call "#Launch.bat"
goto quit

:launch_mobile
echo.
echo Lancement de la version mobile (Android)...
call mobile\scripts\launch-android.bat
goto quit

:after_build
echo.
pause
goto menu

:quit
endlocal
exit /b 0
