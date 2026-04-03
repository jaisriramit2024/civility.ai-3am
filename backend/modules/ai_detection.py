"""
AI-Generated Image Detection Module
Uses statistical analysis and frequency-domain features to detect AI-generated images.
Analyzes patterns common in GAN/diffusion-generated images.
"""

import numpy as np
import cv2
from scipy import fft as scipy_fft
from PIL import Image


class AIDetector:
    """Detects AI-generated images using multiple heuristic approaches."""

    def __init__(self):
        self.weights = {
            "frequency_analysis": 0.30,
            "color_distribution": 0.20,
            "texture_analysis": 0.20,
            "symmetry_analysis": 0.15,
            "gradient_analysis": 0.15,
        }

    def analyze(self, np_image: np.ndarray, pil_image: Image.Image) -> dict:
        """Run full AI detection analysis."""
        freq_score = self._frequency_analysis(np_image)
        color_score = self._color_distribution_analysis(np_image)
        texture_score = self._texture_analysis(np_image)
        symmetry_score = self._symmetry_analysis(np_image)
        gradient_score = self._gradient_analysis(np_image)

        weighted_score = (
            freq_score * self.weights["frequency_analysis"]
            + color_score * self.weights["color_distribution"]
            + texture_score * self.weights["texture_analysis"]
            + symmetry_score * self.weights["symmetry_analysis"]
            + gradient_score * self.weights["gradient_analysis"]
        )

        return {
            "ai_generated_score": round(weighted_score, 3),
            "details": {
                "frequency_analysis": {
                    "score": round(freq_score, 3),
                    "weight": self.weights["frequency_analysis"],
                    "description": "Analyzes frequency domain for GAN artifacts",
                },
                "color_distribution": {
                    "score": round(color_score, 3),
                    "weight": self.weights["color_distribution"],
                    "description": "Checks for unnatural color distributions",
                },
                "texture_analysis": {
                    "score": round(texture_score, 3),
                    "weight": self.weights["texture_analysis"],
                    "description": "Detects synthetic texture patterns",
                },
                "symmetry_analysis": {
                    "score": round(symmetry_score, 3),
                    "weight": self.weights["symmetry_analysis"],
                    "description": "Checks for unnatural symmetry in image",
                },
                "gradient_analysis": {
                    "score": round(gradient_score, 3),
                    "weight": self.weights["gradient_analysis"],
                    "description": "Analyzes gradient smoothness patterns",
                },
            },
        }

    def _frequency_analysis(self, img: np.ndarray) -> float:
        """
        Analyze frequency domain using FFT.
        AI-generated images often have distinct frequency patterns—
        GAN images may show periodic artifacts in high-frequency bands.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        f_transform = scipy_fft.fft2(gray)
        f_shift = scipy_fft.fftshift(f_transform)
        magnitude = np.abs(f_shift)
        magnitude_log = np.log1p(magnitude)

        h, w = magnitude_log.shape
        center_h, center_w = h // 2, w // 2

        # Analyze ratio of high to low frequency energy
        radius_low = min(h, w) // 8
        radius_high = min(h, w) // 3

        y, x = np.ogrid[:h, :w]
        dist = np.sqrt((x - center_w) ** 2 + (y - center_h) ** 2)

        low_mask = dist <= radius_low
        high_mask = (dist > radius_high)

        low_energy = np.mean(magnitude_log[low_mask]) if np.any(low_mask) else 1.0
        high_energy = np.mean(magnitude_log[high_mask]) if np.any(high_mask) else 0.0

        ratio = high_energy / (low_energy + 1e-10)

        # AI images tend to have more uniform frequency distribution
        # Natural images have sharper falloff
        if ratio > 0.65:
            score = min(0.9, 0.3 + (ratio - 0.65) * 2)
        elif ratio > 0.45:
            score = 0.3 + (ratio - 0.45) * 0.5
        else:
            score = max(0.05, ratio * 0.6)

        return float(np.clip(score, 0, 1))

    def _color_distribution_analysis(self, img: np.ndarray) -> float:
        """
        Analyze color distribution patterns.
        AI-generated images often have smoother, more uniform color histograms.
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Check saturation distribution
        sat_hist = cv2.calcHist([hsv], [1], None, [256], [0, 256])
        sat_hist = sat_hist.flatten() / sat_hist.sum()
        sat_entropy = -np.sum(sat_hist[sat_hist > 0] * np.log2(sat_hist[sat_hist > 0]))

        # Check value channel distribution
        val_hist = cv2.calcHist([hsv], [2], None, [256], [0, 256])
        val_hist = val_hist.flatten() / val_hist.sum()
        val_entropy = -np.sum(val_hist[val_hist > 0] * np.log2(val_hist[val_hist > 0]))

        # High entropy in both = potentially AI (too smooth/perfect distribution)
        avg_entropy = (sat_entropy + val_entropy) / 2
        max_entropy = np.log2(256)  # ~8.0

        # Normalize: mid-range entropy is most natural
        normalized = avg_entropy / max_entropy
        if normalized > 0.85:
            score = 0.6 + (normalized - 0.85) * 2
        elif normalized > 0.7:
            score = 0.3 + (normalized - 0.7) * 2
        else:
            score = max(0.05, normalized * 0.4)

        return float(np.clip(score, 0, 1))

    def _texture_analysis(self, img: np.ndarray) -> float:
        """
        Analyze texture patterns using Local Binary Patterns approximation.
        AI images often have overly smooth or repetitive textures.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Compute Laplacian variance (measure of texture detail)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        lap_var = laplacian.var()

        # Compute local standard deviation
        local_mean = cv2.blur(gray.astype(np.float64), (5, 5))
        local_sq_mean = cv2.blur((gray.astype(np.float64)) ** 2, (5, 5))
        local_std = np.sqrt(np.maximum(local_sq_mean - local_mean ** 2, 0))
        avg_local_std = np.mean(local_std)

        # Very low texture variance may indicate AI smoothing
        # Very high and uniform can also be suspicious
        texture_score = 0.0

        if lap_var < 100:
            texture_score = 0.7 + min(0.25, (100 - lap_var) / 400)
        elif lap_var < 500:
            texture_score = 0.3 + (500 - lap_var) / 1000
        else:
            texture_score = max(0.05, 0.3 - (lap_var - 500) / 5000)

        # Adjust based on local std uniformity
        std_of_local_std = np.std(local_std)
        if std_of_local_std < 15:
            texture_score = min(1.0, texture_score + 0.15)

        return float(np.clip(texture_score, 0, 1))

    def _symmetry_analysis(self, img: np.ndarray) -> float:
        """
        Check for unnatural bilateral symmetry.
        Some AI generators produce overly symmetric outputs.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
        h, w = gray.shape

        # Horizontal symmetry
        left = gray[:, : w // 2]
        right = np.fliplr(gray[:, w // 2 : w // 2 + left.shape[1]])
        h_diff = np.mean(np.abs(left - right))

        # Vertical symmetry
        top = gray[: h // 2, :]
        bottom = np.flipud(gray[h // 2 : h // 2 + top.shape[0], :])
        v_diff = np.mean(np.abs(top - bottom))

        avg_diff = (h_diff + v_diff) / 2

        # Lower difference = more symmetric = potentially AI
        if avg_diff < 10:
            score = 0.8
        elif avg_diff < 25:
            score = 0.5 + (25 - avg_diff) / 50
        elif avg_diff < 50:
            score = 0.2 + (50 - avg_diff) / 100
        else:
            score = max(0.05, 0.2 - (avg_diff - 50) / 500)

        return float(np.clip(score, 0, 1))

    def _gradient_analysis(self, img: np.ndarray) -> float:
        """
        Analyze gradient patterns.
        AI images may have artificially smooth or uniform gradients.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)

        # Sobel gradients
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_magnitude = np.sqrt(grad_x ** 2 + grad_y ** 2)

        # Statistics of gradient magnitude
        mean_grad = np.mean(gradient_magnitude)
        std_grad = np.std(gradient_magnitude)

        # Coefficient of variation
        cv_grad = std_grad / (mean_grad + 1e-10)

        # AI images tend to have lower gradient variation
        if cv_grad < 1.5:
            score = 0.6 + (1.5 - cv_grad) * 0.25
        elif cv_grad < 2.5:
            score = 0.3 + (2.5 - cv_grad) * 0.3
        else:
            score = max(0.05, 0.3 - (cv_grad - 2.5) * 0.1)

        return float(np.clip(score, 0, 1))
