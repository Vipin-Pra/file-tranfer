@echo off
title P2P Launcher
color 0A

echo ========================================
echo   P2P File Transfer and Video Call App
echo ========================================
echo.
echo Starting backend and frontend servers...
echo.

:: Start Backend Server in a new window
start "Backend Server (Port 3001)" cmd /k "cd /d "%~dp0backend" && npm start"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: Start Frontend Server in a new window
start "Frontend Server (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 3 seconds for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Servers are starting up!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

:: Open default browser
start http://localhost:5173

echo.
echo ========================================
echo   All systems ready!
echo ========================================
echo.
echo Backend and Frontend are running in separate windows.
echo Close those windows to stop the servers.
echo.
echo Press any key to close this launcher...
pause >nul
