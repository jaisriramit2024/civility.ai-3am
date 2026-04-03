"""
Image Tampering / Morphing Detection Module
Uses Error Level Analysis (ELA), noise inconsistency detection,
edge artifact analysis, and copy-move detection.
"""

import io
import numpy as np
import cv2
from PIL import Image
import base64


class TamperingDetector:
    """Detects image manipulation and morphing using multiple techniques."""

    def __init__(self):
        self.weights = {
            "ela": 0.35,
            "noise_inconsistency": 0.25,
            "edge_artifacts": 0.20,
            "copy_move": 0.20,
        }

    def analyze(self, pil_image: Image.Image, np_image: np.ndarray) -> dict:
        """Run full tampering detection analysis."""
        ela_result = self._error_level_analysis(pil_image)
        noise_result = self._noise_inconsistency(np_image)
        edge_result = self._edge_artifact_detection(np_image)
        copy_move_result = self._copy_move_detection(np_image)

        weighted_score = (
            ela_result["score"] * self.weights["ela"]
            + noise_result["score"] * self.weights["noise_inconsistency"]
            + edge_result["score"] * self.weights["edge_artifacts"]
            + copy_move_result["score"] * self.weights["copy_move"]
        )

        return {
            "tampering_score": round(weighted_score, 3),
            "ela_heatmap": ela_result.get("heatmap_b64"),
            "details": {
                "error_level_analysis": {
                    "score": round(ela_result["score"], 3),
                    "weight": self.weights["ela"],
                    "description": "Detects re-compression artifacts from editing",
                    "max_ela_value": ela_result.get("max_val", 0),
                },
                "noise_inconsistency": {
                    "score": round(noise_result["score"], 3),
                    "weight": self.weights["noise_inconsistency"],
                    "description": "Detects inconsistent noise levels across regions",
                    "noise_std": noise_result.get("noise_std", 0),
                },
                "edge_artifacts": {
                    "score": round(edge_result["score"], 3),
                    "weight": self.weights["edge_artifacts"],
                    "description": "Detects unnatural edges from splicing/compositing",
                    "artifact_ratio": edge_result.get("artifact_ratio", 0),
                },
                "copy_move_detection": {
                    "score": round(copy_move_result["score"], 3),
                    "weight": self.weights["copy_move"],
                    "description": "Detects duplicated/cloned regions within the image",
                },
            },
        }

    def _error_level_analysis(self, pil_image: Image.Image) -> dict:
        """
        Error Level Analysis (ELA):
        Re-saves the image at a known quality and compares with original.
        Modified regions show different error levels.
        """
        quality = 90

        # Re-save at known quality
        buffer = io.BytesIO()
        pil_image.save(buffer, "JPEG", quality=quality)
        buffer.seek(0)
        resaved = Image.open(buffer).convert("RGB")

        # Compute difference
        original_arr = np.array(pil_image).astype(np.float64)
        resaved_arr = np.array(resaved).astype(np.float64)
        diff = np.abs(original_arr - resaved_arr)

        # Scale for visibility
        scale = 255.0 / (diff.max() + 1e-10)
        ela_image = (diff * scale).astype(np.uint8)

        # Compute ELA statistics
        ela_gray = cv2.cvtColor(ela_image, cv2.COLOR_RGB2GRAY)
        max_val = float(ela_gray.max())
        mean_val = float(ela_gray.mean())
        std_val = float(ela_gray.std())

        # Generate heatmap
        heatmap = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)
        _, heatmap_encoded = cv2.imencode(".png", heatmap)
        heatmap_b64 = base64.b64encode(heatmap_encoded.tobytes()).decode("utf-8")

        # Score based on ELA variance (high variance = likely tampered)
        if std_val > 40:
            score = min(0.95, 0.5 + (std_val - 40) / 100)
        elif std_val > 20:
            score = 0.3 + (std_val - 20) / 50
        elif std_val > 10:
            score = 0.15 + (std_val - 10) / 60
        else:
            score = max(0.05, std_val / 60)

        return {
            "score": float(np.clip(score, 0, 1)),
            "heatmap_b64": heatmap_b64,
            "max_val": round(max_val, 2),
            "mean_val": round(mean_val, 2),
            "std_val": round(std_val, 2),
        }

    def _noise_inconsistency(self, img: np.ndarray) -> dict:
        """
        Detect inconsistent noise levels across image regions.
        Manipulated regions often have different noise characteristics.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)

        # Divide image into blocks and analyze noise in each
        block_size = 32
        h, w = gray.shape
        noise_levels = []

        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = gray[y : y + block_size, x : x + block_size]
                # Estimate noise using Laplacian
                laplacian = cv2.Laplacian(block, cv2.CV_64F)
                noise = np.std(laplacian)
                noise_levels.append(noise)

        noise_levels = np.array(noise_levels)

        if len(noise_levels) < 4:
            return {"score": 0.1, "noise_std": 0.0}

        # High variance in noise levels across blocks = suspicious
        noise_std = float(np.std(noise_levels))
        noise_mean = float(np.mean(noise_levels))
        cv_noise = noise_std / (noise_mean + 1e-10)

        if cv_noise > 0.8:
            score = min(0.95, 0.5 + (cv_noise - 0.8) * 1.5)
        elif cv_noise > 0.5:
            score = 0.3 + (cv_noise - 0.5) * 0.67
        elif cv_noise > 0.3:
            score = 0.15 + (cv_noise - 0.3) * 0.75
        else:
            score = max(0.05, cv_noise * 0.5)

        return {
            "score": float(np.clip(score, 0, 1)),
            "noise_std": round(noise_std, 3),
        }

    def _edge_artifact_detection(self, img: np.ndarray) -> dict:
        """
        Detect unnatural edge artifacts from image splicing.
        Composited images often have visible or detectable seams.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Multi-scale edge detection
        edges_fine = cv2.Canny(gray, 50, 150)
        edges_coarse = cv2.Canny(gray, 100, 200)

        # Compare edge maps - unnatural edges appear at fine but not coarse
        diff_edges = cv2.subtract(edges_fine, edges_coarse)

        total_fine_edges = np.sum(edges_fine > 0)
        artifact_edges = np.sum(diff_edges > 0)

        if total_fine_edges == 0:
            return {"score": 0.1, "artifact_ratio": 0.0}

        artifact_ratio = artifact_edges / total_fine_edges

        # Analyze edge coherence using gradient direction
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        angles = np.arctan2(grad_y, grad_x)

        # Check for abrupt angle changes (splice indicators)
        angle_diff = np.abs(np.diff(angles, axis=1))
        abrupt_changes = np.sum(angle_diff > np.pi / 2)
        total_pixels = angle_diff.size
        abrupt_ratio = abrupt_changes / (total_pixels + 1e-10)

        combined_ratio = (artifact_ratio + abrupt_ratio) / 2

        if combined_ratio > 0.4:
            score = min(0.95, 0.6 + (combined_ratio - 0.4) * 0.5)
        elif combined_ratio > 0.2:
            score = 0.3 + (combined_ratio - 0.2) * 1.5
        else:
            score = max(0.05, combined_ratio * 1.5)

        return {
            "score": float(np.clip(score, 0, 1)),
            "artifact_ratio": round(float(artifact_ratio), 4),
        }

    def _copy_move_detection(self, img: np.ndarray) -> dict:
        """
        Detect copy-move forgery by finding similar blocks within the image.
        Uses block-based DCT matching.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Resize for efficiency
        scale = min(256 / max(h, w), 1.0)
        if scale < 1.0:
            gray = cv2.resize(
                gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
            )

        h, w = gray.shape
        block_size = 16
        blocks = []
        positions = []

        for y in range(0, h - block_size, block_size // 2):
            for x in range(0, w - block_size, block_size // 2):
                block = gray[y : y + block_size, x : x + block_size]
                block_flat = block.flatten().astype(np.float32)
                # Normalize block
                norm = np.linalg.norm(block_flat)
                if norm > 0:
                    block_flat = block_flat / norm
                blocks.append(block_flat)
                positions.append((x, y))

        if len(blocks) < 10:
            return {"score": 0.05}

        blocks = np.array(blocks)

        # Sample random pairs and check similarity
        n_samples = min(5000, len(blocks) * (len(blocks) - 1) // 2)
        rng = np.random.RandomState(42)
        similar_count = 0
        min_distance = block_size * 2  # Minimum pixel distance to count

        for _ in range(n_samples):
            i, j = rng.choice(len(blocks), 2, replace=False)
            similarity = np.dot(blocks[i], blocks[j])

            if similarity > 0.95:
                pos_i, pos_j = positions[i], positions[j]
                dist = np.sqrt(
                    (pos_i[0] - pos_j[0]) ** 2 + (pos_i[1] - pos_j[1]) ** 2
                )
                if dist > min_distance:
                    similar_count += 1

        match_ratio = similar_count / n_samples

        if match_ratio > 0.05:
            score = min(0.95, 0.5 + (match_ratio - 0.05) * 3)
        elif match_ratio > 0.02:
            score = 0.3 + (match_ratio - 0.02) * 6.67
        elif match_ratio > 0.01:
            score = 0.15 + (match_ratio - 0.01) * 15
        else:
            score = max(0.05, match_ratio * 15)

        return {"score": float(np.clip(score, 0, 1))}
