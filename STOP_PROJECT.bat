@echo off
title Stop P2P Servers
color 0C

echo ========================================
echo   Stopping All Servers
echo ========================================
echo.

:: Kill all node processes (stops both backend and frontend)
taskkill /F /IM node.exe 2>nul

if %errorlevel% equ 0 (
    echo ✓ All servers stopped successfully!
) else (
    echo ℹ No running servers found.
)

echo.
echo Press any key to exit...
pause >nul
