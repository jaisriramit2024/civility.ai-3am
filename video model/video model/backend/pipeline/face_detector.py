"""
face_detector.py
----------------
Detects and crops face regions from image frames using MediaPipe.
Falls back to the full frame if no face is detected.
"""

import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazily import mediapipe to avoid startup cost
_mp_face_detection = None
_mp_drawing = None


def _get_face_detection():
    """Lazily initialise MediaPipe face detection (min_detection_confidence=0.5)."""
    global _mp_face_detection
    if _mp_face_detection is None:
        import mediapipe as mp
        _mp_face_detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1,          # long-range model
            min_detection_confidence=0.4,
        )
    return _mp_face_detection


def detect_and_crop_face(image_path: str, target_size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Detect the largest face in an image and return a cropped, resized numpy array.

    Args:
        image_path:   Path to input JPEG frame.
        target_size:  (width, height) to resize the crop to.

    Returns:
        numpy.ndarray of shape (H, W, 3), dtype uint8, RGB order.
        If no face detected, the full image is resized and returned.
    """
    import cv2

    bgr = cv2.imread(image_path)
    if bgr is None:
        logger.warning("Could not read image: %s — returning blank frame", image_path)
        return np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]

    try:
        detector = _get_face_detection()
        result = detector.process(rgb)

        if result.detections:
            # Pick the detection with the highest confidence
            best = max(result.detections, key=lambda d: d.score[0])
            bbox = best.location_data.relative_bounding_box

            # Convert relative coords → pixel coords with a 20% margin
            margin = 0.15
            x1 = max(0, int((bbox.xmin - margin * bbox.width) * w))
            y1 = max(0, int((bbox.ymin - margin * bbox.height) * h))
            x2 = min(w, int((bbox.xmin + (1 + margin) * bbox.width) * w))
            y2 = min(h, int((bbox.ymin + (1 + margin) * bbox.height) * h))

            face_crop = rgb[y1:y2, x1:x2]
            if face_crop.size == 0:
                logger.debug("Empty face crop from %s, using full frame", image_path)
                face_crop = rgb
        else:
            logger.debug("No face detected in %s, using full frame", image_path)
            face_crop = rgb

    except Exception as exc:
        logger.warning("Face detection error on %s: %s", image_path, exc)
        face_crop = rgb

    # Resize to model input size
    pil = Image.fromarray(face_crop).resize(target_size, Image.LANCZOS)
    return np.array(pil)
