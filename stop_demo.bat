@echo off
title Multimodal Deepfake Detection - Quick Stopper
color 0c

echo =====================================================================
echo    STOPPING MULTIMODAL DEEPFAKE DETECTION SERVERS
echo =====================================================================
echo.

echo [1/2] Stopping Backend on port 8000 (Python / Uvicorn)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/2] Stopping Frontend on port 3000 (Node / Next.js)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo =====================================================================
echo    All Deepfake Detection servers have been stopped.
echo =====================================================================
echo.
pause
