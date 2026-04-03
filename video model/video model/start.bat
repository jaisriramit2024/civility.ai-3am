@echo off
REM Startup script for the Deepfake Detection application (Windows)
REM This script starts both the backend and frontend servers

echo.
echo ========================================
echo Deepfake Detection Application Startup
echo ========================================
echo.

REM Check if Python is installed
python --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    exit /b 1
)

REM Check if Node.js is installed
node --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)

REM Check if FFmpeg is installed
ffmpeg -version > nul 2>&1
if errorlevel 1 (
    echo ERROR: FFmpeg not found. Please install FFmpeg and add to PATH
    echo Windows: winget install ffmpeg
    exit /b 1
)

echo ✓ All prerequisites found
echo.

REM Start backend
echo Starting Backend Server...
start cmd /k "cd backend && python -m venv venv && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

timeout /t 3

REM Start frontend
echo Starting Frontend Server...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ========================================
echo Servers starting...
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:3000
echo ========================================
echo.
