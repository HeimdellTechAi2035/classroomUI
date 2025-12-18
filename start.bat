@echo off
REM RemoteAbility Classroom - Local Launcher

echo Starting RemoteAbility Classroom...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first time...
    call npm install
)

REM Start dev server and keep window open
start "RemoteAbility Server" cmd /k "npm run dev"

echo Waiting for server to start...
timeout /t 6 /nobreak >nul

REM Open in browser
start "" "http://localhost:5174"

echo.
echo Classroom opened at http://localhost:5174
echo Close the server window to stop.
