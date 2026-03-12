@echo off
echo ========================================
echo   Frontend Setup for Vercel Deployment
echo ========================================
echo.

cd frontend

echo Installing dependencies...
call npm install

echo.
echo Building production bundle...
call npm run build

echo.
echo ========================================
echo Frontend is ready for deployment!
echo ========================================
echo.
echo Next Steps:
echo 1. Update .env with backend URL
echo 2. Deploy to Vercel: vercel --prod
echo 3. Or use Vercel Dashboard
echo.

pause
