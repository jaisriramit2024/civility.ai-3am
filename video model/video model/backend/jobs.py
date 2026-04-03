"""
jobs.py
-------
In-memory job store for background deepfake-detection tasks.

Each job progresses through:
  pending → processing → done | error

A background thread runs the full pipeline for each job.
"""

import logging
import threading
import traceback
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


@dataclass
class Job:
    job_id: str
    video_path: str
    frames_dir: str
    status: JobStatus = JobStatus.PENDING
    progress: int = 0          # 0–100
    result: dict[str, Any] | None = None
    error: str | None = None
    suspicious_frames: list[int] = field(default_factory=list)


# -------------------------------------------------------------------
# Singleton store
# -------------------------------------------------------------------
_store: dict[str, Job] = {}
_lock = threading.Lock()


def create_job(video_path: str, frames_dir: str) -> Job:
    """Create and register a new job, returning the Job object."""
    job_id = str(uuid.uuid4())
    job = Job(job_id=job_id, video_path=video_path, frames_dir=frames_dir)
    with _lock:
        _store[job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    """Retrieve a job by ID."""
    with _lock:
        return _store.get(job_id)


def _update(job_id: str, **kwargs: Any) -> None:
    with _lock:
        job = _store.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)


# -------------------------------------------------------------------
# Background runner
# -------------------------------------------------------------------
def run_pipeline_async(job: Job) -> None:
    """
    Spawn a daemon thread that executes the full detection pipeline for *job*.
    Updates job.status, job.progress, job.result as it progresses.
    """
    t = threading.Thread(target=_run_pipeline, args=(job,), daemon=True)
    t.start()


def _run_pipeline(job: Job) -> None:
    """Full pipeline: extract → detect face → infer → aggregate (optimized with batching)."""
    import shutil
    from pipeline.frame_extractor import extract_frames
    from pipeline.face_detector import detect_and_crop_face
    from pipeline.deepfake_model import predict_batch
    from pipeline.aggregator import aggregate

    try:
        _update(job.job_id, status=JobStatus.PROCESSING, progress=5)

        # ---- Step 1: Extract frames at reduced FPS for faster analysis ----
        logger.info("[%s] Extracting frames from %s", job.job_id, job.video_path)
        frame_paths = extract_frames(job.video_path, job.frames_dir, fps=0.5)  # 2x faster: 1 frame per 2 seconds

        if not frame_paths:
            raise ValueError("No frames could be extracted from the video.")

        _update(job.job_id, progress=20)

        # ---- Step 2: Face detection (batch all frames) ----
        scores: list[float] = []
        suspicious_frames: list[int] = []
        total = len(frame_paths)

        # Extract all faces first (parallelizable step)
        face_crops = []
        for fpath in frame_paths:
            face_arr = detect_and_crop_face(fpath)
            face_crops.append(face_arr)

        _update(job.job_id, progress=50)

        # ---- Step 3: Batch model inference (massive speedup) ----
        logger.info("[%s] Running batch inference on %d frames", job.job_id, len(face_crops))
        batch_scores = predict_batch(face_crops)

        # Track results
        for i, score in enumerate(batch_scores, start=1):
            scores.append(score)
            if score > 0.65:
                suspicious_frames.append(i)

            progress = 50 + int((i / total) * 40)
            _update(job.job_id, progress=progress)

        _update(job.job_id, progress=90)

        # ---- Step 4: Aggregate ----
        result = aggregate(scores)
        result["suspicious_frame_indices"] = suspicious_frames

        _update(
            job.job_id,
            status=JobStatus.DONE,
            progress=100,
            result=result,
            suspicious_frames=suspicious_frames,
        )
        logger.info("[%s] Pipeline done. Result: %s", job.job_id, result)

    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] Pipeline error: %s", job.job_id, traceback.format_exc())
        _update(job.job_id, status=JobStatus.ERROR, error=str(exc))

    finally:
        # Clean up the temporary frames directory
        try:
            shutil.rmtree(job.frames_dir, ignore_errors=True)
        except Exception:  # noqa: BLE001
            pass
