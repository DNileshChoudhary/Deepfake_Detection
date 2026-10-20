@echo off
title Multimodal Deepfake Detection - Quick Launcher
color 0e
cd /d "%~dp0"

echo =====================================================================
echo    STARTING REAL-TIME MULTIMODAL DEEPFAKE DETECTION
echo =====================================================================
echo.

echo [1/3] Launching Backend Terminal (FastAPI + AI Models)...
start "Deepfake Detection - Backend" "%~dp0run_backend.bat"

echo [2/3] Launching Frontend Terminal (Next.js Dashboard)...
start "Deepfake Detection - Frontend" "%~dp0run_frontend.bat"

echo.
echo [3/3] Opening browser at http://localhost:3000 in 6 seconds...
timeout /t 6 /nobreak >nul
start http://localhost:3000

echo.
echo =====================================================================
echo    Both terminals are now active and visible on your screen!
echo    To stop both servers, close their windows or run stop_demo.bat.
echo =====================================================================
echo.
pause
