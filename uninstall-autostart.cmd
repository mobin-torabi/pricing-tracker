@echo off
REM Removes the login auto-start launcher and stops the running scheduler.
setlocal
set "LAUNCHER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PricingTracker-Scheduler.vbs"
if exist "%LAUNCHER%" ( del "%LAUNCHER%" & echo Removed "%LAUNCHER%" ) else ( echo No autostart launcher found. )
REM Stop any running scheduler.js daemon.
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*scheduler.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" 2>nul
echo Scheduler stopped.
endlocal
