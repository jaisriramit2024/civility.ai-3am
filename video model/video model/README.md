# Deepfake Detection Application - Full Stack

A production-ready full-stack web application for detecting AI-generated videos and deepfakes.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## 🎯 Overview

This application uses advanced machine learning (EfficientNet-B4 trained on FaceForensics++) to detect whether uploaded videos are:
- **AI Generated** - Fully synthetic deepfake videos
- **Morphed/Manipulated** - Videos with partial manipulations
- **Real/Authentic** - Genuine, unmanipulated footage

## 🏗️ Architecture

### Processing Pipeline

```
1. User uploads video → Backend API
2. FFmpeg extracts frames (1 per second)
3. MediaPipe detects faces in each frame
4. EfficientNet-B4 model predicts on each face
5. Scores aggregated into final classification
6. Results returned to frontend
7. User sees confidence scores and classification
```

## ✨ Features

### Frontend
- ✅ Instagram Reels-style drag-and-drop UI
- ✅ Live video preview player
- ✅ Real-time progress updates
- ✅ Confidence bar visualization
- ✅ Classification badges (Deepfake/Real/Suspicious)
- ✅ Detailed analysis metrics
- ✅ Responsive design

### Backend
- ✅ FastAPI server for high performance
- ✅ Async background processing
- ✅ Job status polling
- ✅ Temporary file handling & cleanup
- ✅ CORS enabled for frontend
- ✅ Comprehensive error handling

### AI/ML
- ✅ EfficientNet-B4 deepfake detection
- ✅ FaceForensics++ pretrained weights
- ✅ MediaPipe face detection
- ✅ OpenCV image processing
- ✅ Frame extraction with FFmpeg
- ✅ Score aggregation with statistical filtering

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Next.js 14**
- **TypeScript**
- **Tailwind CSS** with custom animations
- **Axios** for API calls

### Backend
- **Python 3.10+**
- **FastAPI**
- **PyTorch** (CPU & GPU compatible)
- **OpenCV** for image processing
- **MediaPipe** for face detection
- **FFmpeg** for video processing

### AI/ML
- **EfficientNet-B4** (via timm)
- **TorchVision** for transforms
- **NumPy** for numerical operations

## 📦 Installation & Setup

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **FFmpeg** installed and in PATH
  - Windows: `winget install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

The first run will download the EfficientNet-B4 weights (~350MB) automatically.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔌 API Endpoints

### POST /api/upload
Upload a video for deepfake detection.

**Request:**
```bash
POST /api/upload
Content-Type: multipart/form-data

{
  "file": <video file>
}
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "video_url": "/uploads/550e8400-e29b-41d4-a716-446655440000.mp4"
}
```

### GET /api/status/{job_id}
Check the status of a deepfake detection job.

**Response:**
```json
{
  "status": "done",
  "progress": 100,
  "result": {
    "ai_generated": 0.82,
    "morphed": 0.10,
    "real": 0.08,
    "frame_count": 45,
    "raw_fake_probability": 0.7423
  },
  "error": null
}
```

**Status Values:**
- `pending` - Waiting to be processed
- `processing` - Currently analyzing (5-100%)
- `done` - Analysis complete
- `error` - An error occurred

### GET /api/health
Quick health check.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

## 🚀 Running the Application

### Terminal 1 - Backend
```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Access the Application
Open browser and navigate to: **http://localhost:3000**

## 📁 Project Structure

```
.
├── backend/
│   ├── main.py                    # FastAPI application entry point
│   ├── jobs.py                    # Background job management
│   ├── requirements.txt           # Python dependencies
│   ├── uploads/                   # Temporary uploaded videos
│   ├── frames/                    # Extracted frames (cleaned up)
│   └── pipeline/
│       ├── __init__.py
│       ├── frame_extractor.py    # FFmpeg frame extraction
│       ├── face_detector.py      # MediaPipe face detection
│       ├── deepfake_model.py     # EfficientNet inference
│       └── aggregator.py         # Score aggregation
│
├── frontend/
│   ├── app/
│   │   ├── components/           # React components
│   │   │   ├── UploadBox.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   ├── LoadingAnimation.tsx
│   │   │   ├── Results.tsx
│   │   │   └── Header.tsx
│   │   ├── utils/
│   │   │   └── api.ts            # API client
│   │   ├── page.tsx              # Main page
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Tailwind imports
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── README.md
```

## 📊 How It Works

### Video Upload Flow
1. User drags/drops or selects a video file
2. Frontend validates file type (MP4, MOV, AVI, etc.)
3. Frontend uploads to `/api/upload` endpoint
4. Backend saves video and creates async job

### Background Processing
1. **Frame Extraction** (20%): FFmpeg extracts 1 frame/sec
2. **Face Detection** (20-90%): MediaPipe detects faces in each frame
3. **Model Inference** (ongoing): EfficientNet predicts deepfake probability on each face
4. **Aggregation** (90-100%): Scores averaged with outlier removal

### Result Calculation
- **AI Generated %**: High when all frames are predicted as fake
- **Morphed %**: Weighted by detection confidence levels
- **Real %**: Inverse of fake probability

### Frontend Display
1. Real-time progress updates via polling
2. Results displayed when status="done"
3. Visual confidence bars and classification badge
4. Recommendation based on classification

## ⚙️ Configuration

### Video Processing
Edit `backend/jobs.py`:
```python
fps=1.0  # Frames per second (default: 1)
```

### Face Detection Confidence
Edit `backend/pipeline/face_detector.py`:
```python
min_detection_confidence=0.4  # Adjust detection threshold
```

### Model Selection
Edit `backend/pipeline/deepfake_model.py`:
```python
MODEL_NAME = "tf_efficientnet_b4_ns"  # Can change to another timm model
```

## 🎨 Customization

### Colors
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  deepfake: {
    primary: '#6366f1',      // Indigo
    secondary: '#8b5cf6',    // Purple
    danger: '#ef4444',       // Red
    success: '#10b981',      // Green
  },
}
```

## 📝 Notes

- First run downloads ~350MB of model weights (cached locally)
- Processing time: 15-60 seconds depending on video length and GPU availability
- Videos are stored temporarily and cleaned up after processing
- Frames are deleted after analysis completes
- CORS is enabled for localhost:3000 only (configure for production)

## 🚨 Troubleshooting

### FFmpeg Not Found
```bash
# Windows
winget install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### Model Download Fails
Models are cached in `~/.cache/deepfake_detector/`. Delete folder to re-download.

### Frontend Can't Connect to Backend
Check `.env.local` has correct API URL and backend is running on port 8000.

### CUDA/GPU Issues
The app works on CPU. Remove CUDA if causing errors - PyTorch will auto-detect.

## 📄 License

© 2024 Deepfake Detection.

---

**⚠️ Important Disclaimer**: This tool is for educational and research purposes. It should not be the sole basis for critical decisions. Always verify with additional sources and domain experts.
