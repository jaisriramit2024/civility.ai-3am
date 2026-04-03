"""
aggregator.py
-------------
Aggregates per-frame deepfake prediction scores into a final result dict.

Strategy:
  - Compute the mean fake probability across all frames.
  - Derive 'morphed' as a discounted secondary score.
  - Real = 1 - fake_mean (normalised to sum ≈ 1).
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)


def aggregate(frame_scores: list[float]) -> dict[str, float]:
    """
    Convert a list of per-frame fake-probabilities into a final 3-score dict.

    Args:
        frame_scores: List of floats in [0, 1] — one per frame.

    Returns:
        {
            "ai_generated": float,   # probability this is fully AI-generated
            "morphed":      float,   # probability of partial manipulation
            "real":         float,   # probability of authentic footage
        }
    """
    if not frame_scores:
        logger.warning("No frame scores to aggregate — returning neutral result.")
        return {"ai_generated": 0.0, "morphed": 0.0, "real": 1.0}

    scores = np.array(frame_scores, dtype=np.float64)

    # Remove extreme outliers (top/bottom 10 %) for robustness
    lo, hi = np.percentile(scores, [10, 90])
    trimmed = scores[(scores >= lo) & (scores <= hi)]
    if trimmed.size == 0:
        trimmed = scores

    fake_mean = float(np.mean(trimmed))

    # Heuristic decomposition:
    #   High fake prob → mostly ai_generated
    #   Moderate fake prob → more morphed weight
    ai_generated = fake_mean * _sigmoid_scale(fake_mean, threshold=0.65)
    morphed = fake_mean * (1.0 - _sigmoid_scale(fake_mean, threshold=0.65))
    real = max(0.0, 1.0 - fake_mean)

    # Normalise to sum = 1
    total = ai_generated + morphed + real
    if total > 0:
        ai_generated /= total
        morphed /= total
        real /= total

    result = {
        "ai_generated": round(ai_generated, 4),
        "morphed": round(morphed, 4),
        "real": round(real, 4),
        "frame_count": len(frame_scores),
        "raw_fake_probability": round(float(fake_mean), 4),
    }

    logger.info("Aggregation result: %s", result)
    return result


def _sigmoid_scale(x: float, threshold: float = 0.5, k: float = 10.0) -> float:
    """
    Sigmoid function centred at `threshold`.
    Returns values near 1 when x >> threshold, near 0 when x << threshold.
    Used to gradually shift weight from 'morphed' to 'ai_generated' as
    the fake probability rises.
    """
    return 1.0 / (1.0 + np.exp(-k * (x - threshold)))
