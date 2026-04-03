"""
Image Preprocessing Module
Handles image loading, resizing, normalization, and format conversion.
"""

import io
import numpy as np
from PIL import Image
import cv2


class ImagePreprocessor:
    """Preprocesses images for the detection pipeline."""

    TARGET_SIZE = (512, 512)
    ANALYSIS_SIZE = (256, 256)

    @staticmethod
    def load_image(file_bytes: bytes) -> Image.Image:
        """Load image from bytes."""
        return Image.open(io.BytesIO(file_bytes)).convert("RGB")

    @staticmethod
    def to_numpy(img: Image.Image) -> np.ndarray:
        """Convert PIL Image to numpy array (BGR for OpenCV)."""
        rgb = np.array(img)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    @staticmethod
    def resize(img: Image.Image, size: tuple = None) -> Image.Image:
        """Resize image while maintaining aspect ratio."""
        if size is None:
            size = ImagePreprocessor.TARGET_SIZE
        return img.resize(size, Image.Resampling.LANCZOS)

    @staticmethod
    def normalize(img_array: np.ndarray) -> np.ndarray:
        """Normalize pixel values to [0, 1] range."""
        return img_array.astype(np.float32) / 255.0

    @staticmethod
    def get_image_info(img: Image.Image) -> dict:
        """Extract basic image information."""
        return {
            "width": img.width,
            "height": img.height,
            "format": img.format or "Unknown",
            "mode": img.mode,
            "size_bytes": None,  # Set externally
        }

    @staticmethod
    def prepare_for_analysis(file_bytes: bytes) -> dict:
        """Full preprocessing pipeline returning all needed formats."""
        pil_img = ImagePreprocessor.load_image(file_bytes)
        info = ImagePreprocessor.get_image_info(pil_img)
        info["size_bytes"] = len(file_bytes)

        resized = ImagePreprocessor.resize(pil_img, ImagePreprocessor.ANALYSIS_SIZE)
        np_original = ImagePreprocessor.to_numpy(pil_img)
        np_resized = ImagePreprocessor.to_numpy(resized)
        normalized = ImagePreprocessor.normalize(np_resized)

        return {
            "pil_original": pil_img,
            "pil_resized": resized,
            "np_original": np_original,
            "np_resized": np_resized,
            "normalized": normalized,
            "info": info,
            "raw_bytes": file_bytes,
        }
