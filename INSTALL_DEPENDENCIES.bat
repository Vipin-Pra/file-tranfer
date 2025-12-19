@echo off
title Install Dependencies
color 0E

echo ========================================
echo   Installing Project Dependencies
echo ========================================
echo.

echo [1/2] Installing Backend Dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ✗ Backend installation failed!
    pause
    exit /b 1
)

echo.
echo ✓ Backend dependencies installed!
echo.

echo [2/2] Installing Frontend Dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ✗ Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✓ All dependencies installed!
echo ========================================
echo.
echo You can now run the project using RUN_PROJECT.bat
echo.
pause
