@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
@echo CALLEE0 before
echo ==========================================================
echo   Debug Build APK
echo ==========================================================
@echo CALLEE1 after header
rem --- 1. Verifier Node / npm -----------------------------------------
@echo CALLEE2 after rem1
where npm.cmd >nul 2>nul
@echo CALLEE3 after where npm
if errorlevel 1 (
    @echo CALLEE4 inside if
    echo [ERREUR] npm introuvable.
    exit /b 1
)
@echo CALLEE5 after if block
rem --- 2. Verifier JAVA_HOME ------------------------------------------
@echo CALLEE6 after rem2
if "%JAVA_HOME%"=="" (
    @echo CALLEE7 inside java if
    echo [ERREUR] JAVA_HOME non defini.
    exit /b 1
)
@echo CALLEE8 after java if
echo Installation des dependances npm (si besoin)...
@echo CALLEE9 after echo deps
echo Generation de www/ ...
@echo CALLEE10 end of prefix
endlocal
exit /b 0
