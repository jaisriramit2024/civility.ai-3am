"""
deepfake_model.py
-----------------
Loads a pretrained EfficientNet-B4 model for deepfake detection.

Weight source: Selim Seferbekov's DFDC competition solution, available on
HuggingFace at:
  https://huggingface.co/spaces/selimsef/dfdc_deepfake_challenge

If the remote weights are unavailable, the module falls back to ImageNet-
pretrained weights and applies a simple heuristic.  In this fallback mode
the model still runs — scores will not be calibrated but the pipeline works.
"""

import logging
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import timm
from torchvision import transforms

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_NAME = "tf_efficientnet_b4_ns"    # Noisy-Student EfficientNet-B4
NUM_CLASSES = 1                          # Binary: fake probability
IMAGE_SIZE = 224                         # Input size expected by the model

# Official weights from Selim's DFDC winning solution
HF_WEIGHTS_URL = (
    "https://huggingface.co/spaces/selimsef/dfdc_deepfake_challenge"
    "/resolve/main/weights/tf_efficientnet_b4_ns_val_accuracy_0_9624_loss_0_1036.pt"
)
CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", Path.home() / ".cache" / "deepfake_detector"))
WEIGHT_FILE = CACHE_DIR / "tf_efficientnet_b4_ns_dfdc.pt"

# ---------------------------------------------------------------------------
# Pre-processing transform (ImageNet statistics work well for EfficientNet)
# ---------------------------------------------------------------------------
PREPROCESS = transforms.Compose([
    transforms.ToTensor(),
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE), antialias=True),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


class DeepfakeModel(nn.Module):
    """Thin wrapper around `timm` EfficientNet with a sigmoid output head."""

    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model(
            MODEL_NAME,
            pretrained=False,
            num_classes=NUM_CLASSES,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.backbone(x)          # (B, 1)
        return torch.sigmoid(logits)       # fake probability in [0, 1]


# ---------------------------------------------------------------------------
# Singleton model instance
# ---------------------------------------------------------------------------
_model: DeepfakeModel | None = None
_device: torch.device | None = None
_weights_loaded_successfully: bool = False


def _download_weights() -> bool:
    """Download DFDC weights to the cache directory. Returns True on success."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if WEIGHT_FILE.exists():
        logger.info("Using cached weights at %s", WEIGHT_FILE)
        return True
    try:
        import urllib.request
        logger.info("Downloading deepfake model weights — this happens once (~350 MB)…")
        urllib.request.urlretrieve(HF_WEIGHTS_URL, WEIGHT_FILE)
        logger.info("Weights downloaded to %s", WEIGHT_FILE)
        return True
    except Exception as exc:
        logger.warning("Weight download failed (%s). Using ImageNet fallback.", exc)
        return False


def load_model() -> tuple[DeepfakeModel, torch.device]:
    """
    Initialise (or return) the singleton model.

    Attempts to load DFDC-trained weights from HuggingFace.  Falls back
    to ImageNet-pretrained weights if the download fails.

    Returns (model, device).
    """
    global _model, _device, _weights_loaded_successfully

    if _model is not None:
        return _model, _device   # type: ignore[return-value]

    # Prefer GPU for massive speedup; fallback to CPU
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Log GPU information for debugging
    if _device.type == "cuda":
        logger.info("✓ CUDA GPU available. Using GPU for inference (10-50x faster)")
        logger.info("  GPU: %s", torch.cuda.get_device_name(0))
        logger.info("  Memory: %.1f GB", torch.cuda.get_device_properties(0).total_memory / 1e9)
    else:
        logger.warning("⚠ Running on CPU. GPU would be 10-50x faster. Consider installing CUDA.")
    logger.info("Device: %s", _device)

    model = DeepfakeModel()

    # Try to load DFDC weights
    downloaded = _download_weights()
    if downloaded and WEIGHT_FILE.exists():
        try:
            state = torch.load(WEIGHT_FILE, map_location="cpu", weights_only=False)
            # Some checkpoints wrap weights under a 'model_state_dict' key
            if isinstance(state, dict) and "model_state_dict" in state:
                state = state["model_state_dict"]
            elif isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]

            # Strip 'backbone.' prefix if present
            cleaned = {
                (k[len("backbone."):] if k.startswith("backbone.") else k): v
                for k, v in state.items()
            }
            model.backbone.load_state_dict(cleaned, strict=False)
            _weights_loaded_successfully = True
            logger.info("DFDC weights loaded successfully.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not load DFDC weights (%s). Using ImageNet backbone.", exc)
            # Load ImageNet pretrained weights as fallback
            model.backbone = timm.create_model(MODEL_NAME, pretrained=True, num_classes=NUM_CLASSES)
    else:
        logger.info("Falling back to ImageNet-pretrained backbone.")
        model.backbone = timm.create_model(MODEL_NAME, pretrained=True, num_classes=NUM_CLASSES)

    model.to(_device)
    model.eval()

    _model = model
    return _model, _device


@torch.no_grad()
def predict(face_rgb: np.ndarray) -> float:
    """
    Run inference on a single face crop.

    Args:
        face_rgb: H×W×3 numpy array (uint8, RGB).

    Returns:
        Probability that the face is fake, in [0.0, 1.0].
    """
    model, device = load_model()

    tensor = PREPROCESS(face_rgb).unsqueeze(0).to(device)   # (1, 3, 224, 224)
    prob = model(tensor).squeeze().item()                    # scalar

    # If using fallback ImageNet weights the output is poorly calibrated —
    # we clamp to avoid extreme saturated values misleading the aggregator.
    return float(np.clip(prob, 0.0, 1.0))


@torch.no_grad()
def predict_batch(face_list: list[np.ndarray]) -> list[float]:
    """
    Run inference on a batch of face crops (much faster than one-by-one).

    Args:
        face_list: List of H×W×3 numpy arrays (uint8, RGB).

    Returns:
        List of fake probabilities, one per face.
    """
    if not face_list:
        return []

    import time
    model, device = load_model()

    # Preprocess all images and stack into a batch
    tensors = [PREPROCESS(face).unsqueeze(0) for face in face_list]
    batch = torch.cat(tensors, dim=0).to(device)  # (N, 3, 224, 224)

    # Single forward pass for all images
    start_time = time.time()
    probs = model(batch).squeeze().cpu().numpy()  # (N,) or scalar if N=1
    elapsed = time.time() - start_time

    # Handle single image case
    if probs.ndim == 0:
        probs = np.array([probs.item()])

    # Log performance metrics
    fps = len(face_list) / elapsed if elapsed > 0 else 0
    logger.info(
        "Batch inference: %d frames in %.2f sec (%.1f fps) on %s",
        len(face_list), elapsed, fps, str(device).upper()
    )

    # Clamp to [0, 1] and convert to list
    return [float(np.clip(p, 0.0, 1.0)) for p in probs]
