"""
main.py
-------
FastAPI application entry point for the Deepfake Detection API.

Endpoints:
  POST /api/upload          – Upload a video; returns job_id.
  GET  /api/status/{job_id} – Poll job status / result.
  GET  /api/health          – Quick health check.

Run with:
  uvicorn main:app --reload --port 8000
"""

import logging
import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from jobs import JobStatus, create_job, get_job, run_pipeline_async

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
FRAMES_BASE = BASE_DIR / "frames"

UPLOAD_DIR.mkdir(exist_ok=True)
FRAMES_BASE.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Deepfake Detection API",
    description="Upload a video and detect AI-generated / deepfake content.",
    version="1.0.0",
)

# Allow local Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded videos statically (for preview player)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
MAX_FILE_SIZE_MB = 500


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Accept a video upload, save it, and start background analysis.

    Returns:
        { "job_id": str, "video_url": str }
    """
    # Validate extension
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Save to disk with a unique name
    file_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{file_id}{suffix}"
    frames_dir = str(FRAMES_BASE / file_id)

    try:
        async with aiofiles.open(save_path, "wb") as out:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                await out.write(chunk)
    except Exception as exc:
        logger.error("Failed to save upload: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save video.") from exc

    # Create job and start background pipeline
    job = create_job(video_path=str(save_path), frames_dir=frames_dir)
    run_pipeline_async(job)

    logger.info("Accepted job %s for file %s", job.job_id, save_path.name)

    return {
        "job_id": job.job_id,
        "video_url": f"/uploads/{save_path.name}",
    }


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """
    Poll the status of a deepfake detection job.

    Returns:
        {
            "status": "pending" | "processing" | "done" | "error",
            "progress": int,          # 0–100
            "result": {...} | null,   # present when status=="done"
            "error":  str   | null,   # present when status=="error"
        }
    """
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    response: dict = {
        "status": job.status,
        "progress": job.progress,
        "result": None,
        "error": job.error,
    }

    if job.status == JobStatus.DONE and job.result:
        response["result"] = job.result

    return JSONResponse(content=response)
