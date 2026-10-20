@echo off
title Deepfake Detection - Backend (FastAPI)
color 0a
cd /d "%~dp0"

echo =====================================================================
echo    STARTING MULTIMODAL DEEPFAKE DETECTION BACKEND (PORT 8000)
echo =====================================================================
echo.
echo Loading PyTorch, ViT, Wav2Vec2, and MediaPipe models into memory...
echo.

backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

pause
