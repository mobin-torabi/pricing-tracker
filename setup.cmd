@echo off
REM Windows one-click setup. Double-click this file or run it in a terminal.
where node >nul 2>nul || (echo Node.js is required. Install it from https://nodejs.org/  ^(or: winget install OpenJS.NodeJS^) & pause & exit /b 1)
cd /d "%~dp0"
node setup.js
pause
