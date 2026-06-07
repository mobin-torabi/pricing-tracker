@echo off
REM Daily pricing tracker run, invoked by Windows Task Scheduler.
REM Scrapes both sites and upserts into their Google Sheets.
cd /d "%~dp0"
if not exist "%~dp0logs" mkdir "%~dp0logs"
node run.js >> "%~dp0logs\scheduler.log" 2>&1
