"""
Content Moderation Module
Detects nudity, violence, gore, and other harmful/abusive content.
Uses heuristic-based analysis of visual characteristics.
"""

import numpy as np
import cv2
from PIL import Image


class ContentModerator:
    """Detects harmful/abusive content including nudity, violence, gore."""

    def __init__(self):
        self.weights = {
            "skin_detection": 0.35,
            "violence_patterns": 0.30,
            "gore_indicators": 0.20,
            "blur_analysis": 0.15,
        }

    def analyze(self, np_image: np.ndarray, pil_image: Image.Image) -> dict:
        """Run full content moderation analysis."""
        skin_score = self._detect_skin_content(np_image)
        violence_score = self._detect_violence_patterns(np_image)
        gore_score = self._detect_gore_indicators(np_image)
        blur_score = self._analyze_motion_blur(np_image)

        weighted_score = (
            skin_score * self.weights["skin_detection"]
            + violence_score * self.weights["violence_patterns"]
            + gore_score * self.weights["gore_indicators"]
            + blur_score * self.weights["blur_analysis"]
        )

        # Determine content classification
        classification = self._classify_content(
            skin_score, violence_score, gore_score, blur_score
        )

        return {
            "content_safety_score": round(weighted_score, 3),
            "classification": classification,
            "is_safe": weighted_score < 0.5,
            "details": {
                "skin_detection": {
                    "score": round(skin_score, 3),
                    "weight": self.weights["skin_detection"],
                    "description": "Detects exposed skin regions (nudity)",
                },
                "violence_patterns": {
                    "score": round(violence_score, 3),
                    "weight": self.weights["violence_patterns"],
                    "description": "Detects signs of violence or injury",
                },
                "gore_indicators": {
                    "score": round(gore_score, 3),
                    "weight": self.weights["gore_indicators"],
                    "description": "Detects blood, injuries, or graphic content",
                },
                "blur_analysis": {
                    "score": round(blur_score, 3),
                    "weight": self.weights["blur_analysis"],
                    "description": "Detects motion blur (fighting, impact)",
                },
            },
        }

    def _detect_skin_content(self, img: np.ndarray) -> float:
        """
        Detect skin-like regions that might indicate nudity.
        Analyzes skin tone distribution using HSV color space.
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Skin tone ranges in HSV
        # Hue: 0-20 and 160-180 (reds/oranges typical of skin)
        # Saturation: 20-60 (moderate saturation)
        # Value: 60-255 (reasonable brightness)

        lower_skin1 = np.array([0, 20, 60])
        upper_skin1 = np.array([20, 60, 255])
        lower_skin2 = np.array([160, 20, 60])
        upper_skin2 = np.array([180, 60, 255])

        mask1 = cv2.inRange(hsv, lower_skin1, upper_skin1)
        mask2 = cv2.inRange(hsv, lower_skin2, upper_skin2)
        skin_mask = cv2.bitwise_or(mask1, mask2)

        # Calculate skin coverage percentage
        total_pixels = skin_mask.size
        skin_pixels = np.sum(skin_mask > 0)
        skin_ratio = skin_pixels / total_pixels if total_pixels > 0 else 0

        # Analyze skin region coherence (anatomical likelihood)
        # Find connected components
        _, labels = cv2.connectedComponents(skin_mask)
        num_components = len(np.unique(labels)) - 1

        # Multiple large contiguous skin regions = more likely nude
        contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        large_contours = [c for c in contours if cv2.contourArea(c) > 100]

        # Scoring logic
        score = 0.0

        # Base score from skin ratio
        if skin_ratio > 0.4:
            score += min(0.6, (skin_ratio - 0.4) * 3)
        elif skin_ratio > 0.2:
            score += 0.3 + (skin_ratio - 0.2) * 1.5

        # Additional score from large contiguous regions
        if len(large_contours) >= 2:
            score += min(0.3, (len(large_contours) - 2) * 0.15)

        return float(np.clip(score, 0, 1))

    def _detect_violence_patterns(self, img: np.ndarray) -> float:
        """
        Detect patterns associated with violence:
        - High edge density
        - Unnatural color spikes (bruising colors)
        - Sharp contrast changes
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Edge detection
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.sum(edges > 0) / edges.size

        # Color analysis for bruising/injury colors
        # Purple/dark blue (bruises), red (blood/injury)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Red channel analysis (blood, injuries)
        red_mask = cv2.inRange(hsv, np.array([0, 70, 70]), np.array([10, 255, 255]))
        red_mask2 = cv2.inRange(hsv, np.array([170, 70, 70]), np.array([180, 255, 255]))
        red_regions = np.sum(red_mask > 0) + np.sum(red_mask2 > 0)

        # Purple/blue for bruises
        purple_mask = cv2.inRange(hsv, np.array([125, 50, 50]), np.array([155, 255, 200]))
        purple_regions = np.sum(purple_mask > 0)

        # Black/dark for injuries/shadows
        dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 50]))
        dark_regions = np.sum(dark_mask > 0) / dark_mask.size

        total_pixels = red_regions + purple_regions
        color_score = total_pixels / img.size if img.size > 0 else 0

        # Contrast analysis
        contrast = gray.std()

        # High edge density = likely violence or action
        score = 0.0

        if edge_density > 0.15:
            score += min(0.5, (edge_density - 0.15) * 5)
        elif edge_density > 0.08:
            score += 0.2 + (edge_density - 0.08) * 4

        # Injury-related colors
        if color_score > 0.05:
            score += min(0.4, color_score * 8)

        # Dark regions (shadows, injuries)
        if dark_regions > 0.3:
            score += min(0.2, (dark_regions - 0.3) * 0.5)

        # High contrast might indicate violence
        if contrast > 80:
            score += min(0.1, (contrast - 80) / 800)

        return float(np.clip(score, 0, 1))

    def _detect_gore_indicators(self, img: np.ndarray) -> float:
        """
        Detect gore/graphic injury indicators:
        - Blood color concentration
        - Irregular patterns (lacerations, wounds)
        - Texture discontinuities
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Blood-like colors (dark red, crimson)
        blood_mask1 = cv2.inRange(hsv, np.array([0, 100, 50]), np.array([10, 255, 255]))
        blood_mask2 = cv2.inRange(hsv, np.array([170, 100, 50]), np.array([180, 255, 255]))
        blood_mask = cv2.bitwise_or(blood_mask1, blood_mask2)

        blood_pixels = np.sum(blood_mask > 0)
        blood_ratio = blood_pixels / blood_mask.size if blood_mask.size > 0 else 0

        # Find blood-like region coherence
        if blood_ratio > 0.02:
            # Analyze connectivity of blood regions
            _, labels = cv2.connectedComponents(blood_mask)
            num_clusters = len(np.unique(labels)) - 1

            # Gore typically has more scattered/multiple regions
            if num_clusters > 5:
                cluster_factor = min(0.5, (num_clusters - 5) / 20)
            else:
                cluster_factor = 0.2 if num_clusters > 3 else 0.05
        else:
            cluster_factor = 0.0

        # Wound/laceration detection - sharp transitions in texture
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)

        # High gradient magnitude in localized areas = wounds/injuries
        high_gradient = np.sum(magnitude > 100)
        gradient_density = high_gradient / magnitude.size if magnitude.size > 0 else 0

        # Scoring
        score = 0.0

        # Blood-like color presence
        if blood_ratio > 0.1:
            score += min(0.6, blood_ratio * 6)
        elif blood_ratio > 0.02:
            score += 0.2 + (blood_ratio - 0.02) * 10

        # Cluster factor for multiple injury regions
        score += cluster_factor * 0.4

        # Gradient-based wound detection
        if gradient_density > 0.1:
            score += min(0.3, (gradient_density - 0.1) * 3)

        return float(np.clip(score, 0, 1))

    def _analyze_motion_blur(self, img: np.ndarray) -> float:
        """
        Detect motion blur which often accompanies violence/action.
        Analyzes directional blur patterns.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Laplacian variance (blur detection)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        lap_var = laplacian.var()

        # Very low variance = likely blurred
        # Calculate in regions to find localized blur
        h, w = gray.shape
        block_size = 64
        blur_scores = []

        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = gray[y : y + block_size, x : x + block_size]
                lap = cv2.Laplacian(block, cv2.CV_64F)
                blur_scores.append(lap.var())

        if blur_scores:
            avg_blur = np.mean(blur_scores)
            blur_ratio = np.sum(np.array(blur_scores) < 500) / len(blur_scores)
        else:
            avg_blur = lap_var
            blur_ratio = 0

        # Motion blur specific: directional blur
        # Apply horizontal and vertical blur kernels
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))

        blur_h = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel_h)
        blur_v = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel_v)

        # Directional blur indicates motion
        blur_h_sim = cv2.matchTemplate(blur_h, blur_h, cv2.TM_CCOEFF)
        blur_v_sim = cv2.matchTemplate(blur_v, blur_v, cv2.TM_CCOEFF)

        # Scoring
        score = 0.0

        # Low sharpness = blur (could indicate violence/action)
        if avg_blur < 300:
            score += min(0.4, (300 - avg_blur) / 750)

        # Multiple blurred regions
        if blur_ratio > 0.3:
            score += min(0.3, (blur_ratio - 0.3) * 1)

        # Directionality suggests motion
        if blur_ratio > 0.2:
            score += min(0.3, blur_ratio * 1.5)

        return float(np.clip(score, 0, 1))

    def _classify_content(
        self, skin_score: float, violence_score: float, gore_score: float, blur_score: float
    ) -> str:
        """Classify content based on individual scores."""
        if gore_score > 0.6 or (gore_score > 0.4 and violence_score > 0.5):
            return "Graphic Violence/Gore"
        elif violence_score > 0.65 or (violence_score > 0.5 and blur_score > 0.5):
            return "Violence Detected"
        elif skin_score > 0.7 or (skin_score > 0.5 and violence_score > 0.3):
            return "Nudity Detected"
        elif skin_score > 0.4 or violence_score > 0.4 or gore_score > 0.3:
            return "Potentially Unsafe"
        else:
            return "Safe"
