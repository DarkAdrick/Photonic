@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
call "%~dp0debug-callee.bat"
echo WRAPPER done
endlocal
