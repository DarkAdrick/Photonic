@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
@echo STEP0 before
echo ==========================================================
echo   Debug Build APK
echo ==========================================================
@echo STEP1 after header
rem --- 1. Verifier Node / npm -----------------------------------------
@echo STEP2 after rem1
where npm.cmd >nul 2>nul
@echo STEP3 after where npm
if errorlevel 1 (
    @echo STEP4 inside if
    echo [ERREUR] npm introuvable.
    pause
    exit /b 1
)
@echo STEP5 after if block
rem --- 2. Verifier JAVA_HOME ------------------------------------------
@echo STEP6 after rem2
if "%JAVA_HOME%"=="" (
    @echo STEP7 inside java if
    echo [ERREUR] JAVA_HOME non defini.
    pause
    exit /b 1
)
@echo STEP8 after java if
echo Installation des dependances npm (si besoin)...
@echo STEP9 after echo deps
echo Generation de www/ ...
@echo STEP10 end of prefix
endlocal
exit /b 0
