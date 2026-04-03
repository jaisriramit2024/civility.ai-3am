"""
Scoring Engine Module
Combines all detection module outputs into a weighted final classification.
"""


class ScoringEngine:
    """Combines detection results into a final classification."""

    # Module weights for final score
    MODULE_WEIGHTS = {
        "ai_detection": 0.30,
        "tampering_detection": 0.25,
        "metadata_analysis": 0.15,
        "hash_matching": 0.12,
        "content_moderation": 0.18,  # Content safety is important
    }

    # Classification thresholds
    THRESHOLDS = {
        "ai_generated_high": 0.70,
        "ai_generated_medium": 0.50,
        "manipulated_high": 0.65,
        "manipulated_medium": 0.45,
        "content_unsafe": 0.50,  # Threshold for unsafe content
    }

    @staticmethod
    def classify(
        ai_score: float,
        tampering_score: float,
        metadata_score: float,
        hash_score: float,
        content_safety_score: float = 0.0,
    ) -> dict:
        """
        Classify the image based on combined scores from all modules.
        Includes content safety (nudity, violence, gore detection).
        Returns classification, confidence, and detailed breakdown.
        """
        weights = ScoringEngine.MODULE_WEIGHTS
        thresholds = ScoringEngine.THRESHOLDS

        # Check for unsafe content first (highest priority)
        if content_safety_score >= thresholds["content_unsafe"]:
            return {
                "classification": "⚠️ UNSAFE CONTENT DETECTED",
                "confidence": content_safety_score,
                "risk_level": "Critical",
                "combined_score": 1.0,
                "individual_scores": {
                    "ai_detection": ai_score,
                    "tampering_detection": tampering_score,
                    "metadata_analysis": metadata_score,
                    "hash_matching": hash_score,
                    "content_moderation": content_safety_score,
                },
                "weights": weights,
                "verdict_details": {
                    "ai_likelihood": _score_to_label(ai_score),
                    "tampering_likelihood": _score_to_label(tampering_score),
                    "metadata_suspicion": _score_to_label(metadata_score),
                    "content_safety": "UNSAFE - Image contains abusive content (nudity, violence, gore)",
                },
            }

        # Weighted combination of authenticity scores
        combined_score = (
            ai_score * weights["ai_detection"]
            + tampering_score * weights["tampering_detection"]
            + metadata_score * weights["metadata_analysis"]
            + hash_score * weights["hash_matching"]
            + content_safety_score * weights["content_moderation"]
        )

        # Determine primary classification
        classification = "Real"
        confidence = 0.0
        risk_level = "Low"

        # AI detection dominates if high
        if ai_score >= thresholds["ai_generated_high"]:
            classification = "AI Generated"
            confidence = min(0.99, ai_score * 0.8 + metadata_score * 0.2)
            risk_level = "High"
        elif ai_score >= thresholds["ai_generated_medium"]:
            if metadata_score > 0.4:
                classification = "AI Generated"
                confidence = min(0.95, (ai_score + metadata_score) / 2)
                risk_level = "High"
            else:
                classification = "Possibly AI Generated"
                confidence = ai_score
                risk_level = "Medium"

        # Tampering check (if not already classified as AI)
        if classification == "Real" or classification == "Possibly AI Generated":
            if tampering_score >= thresholds["manipulated_high"]:
                if ai_score < thresholds["ai_generated_medium"]:
                    classification = "Manipulated"
                    confidence = min(0.99, tampering_score * 0.7 + metadata_score * 0.3)
                    risk_level = "High"
            elif tampering_score >= thresholds["manipulated_medium"]:
                if classification == "Real":
                    classification = "Possibly Manipulated"
                    confidence = tampering_score
                    risk_level = "Medium"

        # If still real, compute real confidence
        if classification == "Real":
            real_confidence = 1.0 - combined_score
            confidence = max(0.5, min(0.99, real_confidence))
            risk_level = "Low" if confidence > 0.7 else "Medium"

        # Determine sub-scores for the verdict
        verdict_details = {
            "ai_likelihood": _score_to_label(ai_score),
            "tampering_likelihood": _score_to_label(tampering_score),
            "metadata_suspicion": _score_to_label(metadata_score),
            "content_safety": "Safe" if content_safety_score < 0.5 else f"Caution - Score: {content_safety_score:.2f}",
        }

        return {
            "classification": classification,
            "confidence": round(confidence, 3),
            "risk_level": risk_level,
            "combined_score": round(combined_score, 3),
            "individual_scores": {
                "ai_detection": round(ai_score, 3),
                "tampering_detection": round(tampering_score, 3),
                "metadata_analysis": round(metadata_score, 3),
                "hash_matching": round(hash_score, 3),
                "content_moderation": round(content_safety_score, 3),
            },
            "weights": weights,
            "verdict_details": verdict_details,
        }


def _score_to_label(score: float) -> str:
    """Convert a numeric score to a human-readable label."""
    if score >= 0.8:
        return "Very High"
    elif score >= 0.6:
        return "High"
    elif score >= 0.4:
        return "Medium"
    elif score >= 0.2:
        return "Low"
    else:
        return "Very Low"
