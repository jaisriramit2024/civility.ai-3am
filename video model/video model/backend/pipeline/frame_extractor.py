"""
frame_extractor.py
------------------
Extracts frames from a video file at a configurable rate using FFmpeg.
Returns a list of file paths to the extracted JPEG frames.
"""

import os
import sys
import subprocess
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

# FFmpeg executable path with fallbacks
def _get_ffmpeg_path() -> Path:
    """Get FFmpeg executable path with multiple fallback strategies."""
    candidates = [
        # Explicit WinGet installation path
        r"C:\Users\Nithyaprabha\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\ffmpeg.exe",
        # Environment variable
        os.environ.get("FFMPEG_PATH"),
        # System PATH (using shutil.which)
        shutil.which("ffmpeg"),
        shutil.which("ffmpeg.exe"),
    ]
    
    for path in candidates:
        if path:
            try:
                p = Path(path)
                if p.exists():
                    logger.info("Found FFmpeg at: %s", p)
                    return p
            except (TypeError, ValueError):
                continue
    
    # If no FFmpeg found, raise error with helpful message
    raise RuntimeError(
        "FFmpeg not found. Please install FFmpeg or set FFMPEG_PATH environment variable. "
        "Install with: winget install ffmpeg"
    )

_FFMPEG_PATH = _get_ffmpeg_path()


def extract_frames(
    video_path: str,
    output_dir: str,
    fps: float = 1.0,
) -> list[str]:
    """
    Extract frames from a video at the specified FPS.

    Args:
        video_path: Absolute path to input video file.
        output_dir:  Directory where frames will be saved.
        fps:         Frames per second to extract (default: 1 frame/sec).

    Returns:
        Sorted list of absolute paths to the extracted JPEG frames.
    """
    os.makedirs(output_dir, exist_ok=True)
    frame_pattern = os.path.join(output_dir, "frame_%04d.jpg")

    # Build FFmpeg command with proper string handling
    cmd = [
        str(_FFMPEG_PATH),
        "-i", video_path,
        "-vf", f"fps={fps}",
        "-c:v", "mjpeg",
        "-q:v", "2",
        "-y",  # Overwrite output
        frame_pattern
    ]

    try:
        logger.info("Running FFmpeg command for video: %s", video_path)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False  # Don't raise on non-zero exit
        )
        
        # Check result and log output
        if result.returncode != 0:
            logger.error("FFmpeg failed with return code %d", result.returncode)
            logger.error("FFmpeg stderr: %s", result.stderr)
            raise RuntimeError(f"FFmpeg frame extraction failed: {result.stderr}")
            
        logger.info("FFmpeg frame extraction completed successfully")
        
    except Exception as e:
        logger.error("Error running FFmpeg: %s", str(e))
        raise RuntimeError(f"FFmpeg error: {str(e)}") from e

    frames = sorted(
        [
            os.path.join(output_dir, f)
            for f in os.listdir(output_dir)
            if f.lower().endswith(".jpg")
        ]
    )

    logger.info("Extracted %d frames from %s", len(frames), video_path)
    return frames
