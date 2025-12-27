@echo off
title RemoteAbility Classroom - Starting Servers
color 0A

echo.
echo  ========================================
echo   RemoteAbility Classroom
echo   Starting all servers...
echo  ========================================
echo.

:: Kill any existing processes on our ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak > nul

:: Start WebSocket server in a new window
echo [1/2] Starting WebSocket server on port 3001...
start "WebSocket Server" cmd /k "cd /d %~dp0server && node index.js"

:: Wait a moment for the WebSocket server to start
timeout /t 2 /nobreak > nul

:: Start Vite dev server in a new window
echo [2/2] Starting Vite dev server...
start "Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait for servers to start
timeout /t 3 /nobreak > nul

echo.
echo  ========================================
echo   All servers started!
echo  ========================================
echo.
echo   WebSocket Server: ws://localhost:3001
echo   Frontend:         http://localhost:5174
echo.
echo   Trainer View:     http://localhost:5174/presentation?week=1^&day=1^&role=trainer
echo   Trainee Join:     http://localhost:5174/join
echo.
echo  ========================================
echo.

:: Open the browser to the trainer view
echo Opening browser...
timeout /t 2 /nobreak > nul
start http://localhost:5174

echo.
echo Press any key to close this window (servers will keep running)...
pause > nul
