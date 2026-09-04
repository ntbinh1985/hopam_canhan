@echo off
cd /d "%~dp0"
set "PATH=%CD%\node-v24.20.0-win-x64;%PATH%"
node node_modules\next\dist\bin\next dev
pause