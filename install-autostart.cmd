@echo off
REM Installs the daily scheduler to auto-start at Windows login (no Task Scheduler),
REM then starts it now. Re-run this any time the project is moved.
setlocal
set "PROJ=%~dp0"
if "%PROJ:~-1%"=="\" set "PROJ=%PROJ:~0,-1%"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%STARTUP%\PricingTracker-Scheduler.vbs"

where node >nul 2>nul || (echo [!] Node.js not found on PATH. Install it first: https://nodejs.org/ & exit /b 1)

> "%LAUNCHER%" echo Set sh = CreateObject("WScript.Shell")
>> "%LAUNCHER%" echo sh.CurrentDirectory = "%PROJ%"
>> "%LAUNCHER%" echo sh.Run "node scheduler.js", 0, False

echo Installed autostart launcher:
echo   "%LAUNCHER%"
echo   -> %PROJ%

wscript "%LAUNCHER%"
echo Scheduler started (hidden). It will also start automatically at each login.
endlocal
