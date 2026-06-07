@echo off
REM =====================================================================
REM  Pricing Tracker - one-click installer (Windows)
REM  Double-click this file. It does EVERYTHING automatically:
REM    - installs Node.js if missing (via winget)
REM    - installs dependencies + a browser
REM    - on first run, if no Google client exists yet, points you to the quick
REM      2-min credentials/SETUP.md (one-time), then continues
REM    - opens your browser ONCE so you click "Allow" (Google requires this)
REM    - creates YOUR OWN Google Sheets and fills them
REM    - turns on the daily automatic run
REM =====================================================================
title Pricing Tracker - Installer
cd /d "%~dp0"
echo(
echo ============================================
echo   Pricing Tracker - Installer
echo ============================================
echo(

REM ---- 1) Ensure Node.js -------------------------------------------------
where node >nul 2>nul
if not errorlevel 1 goto NODE_OK
echo Node.js was not found. Installing it automatically...
where winget >nul 2>nul
if errorlevel 1 (
  echo(
  echo [!] Cannot auto-install Node.js ^(winget not available^).
  echo     Please install Node.js from https://nodejs.org/ and run this again.
  echo(
  pause & exit /b 1
)
winget install -e --id OpenJS.NodeJS.LTS -h --accept-package-agreements --accept-source-agreements
set "PATH=%PATH%;%ProgramFiles%\nodejs"
where node >nul 2>nul
if errorlevel 1 (
  echo(
  echo [i] Node.js was installed. Please CLOSE this window and double-click INSTALL.cmd again.
  echo(
  pause & exit /b 0
)
:NODE_OK
for /f "delims=" %%v in ('node --version') do echo Using Node %%v
echo(

REM ---- 2) Dependencies + browser + Google authorization -----------------
echo Setting up dependencies, browser and Google sign-in...
echo (First time only: if asked, follow credentials\SETUP.md ^(~2 min^) then re-run.)
echo (A browser window will open once - pick your Google account and click Allow.)
echo(
node setup.js
if errorlevel 1 (
  echo(
  echo [!] Setup did not finish. See the messages above, then run INSTALL.cmd again.
  pause & exit /b 1
)
echo(

REM ---- 3) First scrape: creates YOUR sheets and fills them ---------------
echo Creating your Google Sheets and collecting prices ^(takes a few minutes^)...
node run.js
echo(

REM ---- 4) Daily automatic run -------------------------------------------
echo Turning on the daily automatic run...
call "%~dp0install-autostart.cmd"
echo(
echo ============================================
echo   All done!
echo   - Your two Google Sheets were created in your Google Drive.
echo   - The tracker will update them every day automatically.
echo   - Sheet links are saved in config.local.json (and printed above).
echo ============================================
echo(
pause
