#!/bin/bash
# Startup script for the Deepfake Detection application (macOS/Linux)

echo ""
echo "========================================"
echo "Deepfake Detection Application Startup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.10+"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: FFmpeg not found. Please install FFmpeg"
    echo "macOS: brew install ffmpeg"
    echo "Linux: sudo apt-get install ffmpeg"
    exit 1
fi

echo "✓ All prerequisites found"
echo ""

# Start backend
echo "Starting Backend Server..."
(
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
) &
BACKEND_PID=$!

sleep 3

# Start frontend
echo "Starting Frontend Server..."
(
    cd frontend
    npm install
    npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Servers starting..."
echo "- Backend:  http://localhost:8000"
echo "- Frontend: http://localhost:3000"
echo "========================================"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
