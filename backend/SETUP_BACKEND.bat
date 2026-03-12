@echo off
echo ========================================
echo   Backend Setup for Render Deployment
echo ========================================
echo.

cd backend

echo Installing production dependencies...
call npm install

echo.
echo ========================================
echo Backend is ready for deployment!
echo ========================================
echo.
echo Next Steps:
echo 1. Push code to GitHub
echo 2. Connect to Render.com
echo 3. Deploy as Web Service
echo 4. Set environment variable: CORS_ORIGIN
echo.

pause
