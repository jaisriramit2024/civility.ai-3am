"""
Metadata Analysis Module
Inspects EXIF data and other metadata to detect suspicious patterns.
"""

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import re


class MetadataAnalyzer:
    """Analyzes image metadata for signs of manipulation or AI generation."""

    # Known AI generation software signatures
    AI_SOFTWARE_SIGNATURES = [
        "stable diffusion",
        "midjourney",
        "dall-e",
        "dalle",
        "novelai",
        "artbreeder",
        "deepai",
        "nightcafe",
        "jasper art",
        "adobe firefly",
        "bing image creator",
        "leonardo.ai",
        "playground ai",
        "craiyon",
        "gan",
        "diffusion",
        "comfyui",
        "automatic1111",
        "invokeai",
    ]

    # Common photo editing software
    EDITING_SOFTWARE = [
        "photoshop",
        "gimp",
        "lightroom",
        "affinity",
        "paint.net",
        "pixelmator",
        "canva",
        "figma",
        "snapseed",
        "vsco",
    ]

    def analyze(self, pil_image: Image.Image) -> dict:
        """Run full metadata analysis."""
        exif_data = self._extract_exif(pil_image)
        suspicion_result = self._analyze_suspicion(exif_data)

        return {
            "metadata_score": round(suspicion_result["score"], 3),
            "exif_present": bool(exif_data),
            "exif_data": exif_data,
            "flags": suspicion_result["flags"],
            "details": {
                "has_camera_info": suspicion_result.get("has_camera", False),
                "has_gps": suspicion_result.get("has_gps", False),
                "has_thumbnail": suspicion_result.get("has_thumbnail", False),
                "software_detected": suspicion_result.get("software", "None"),
                "ai_signature_found": suspicion_result.get("ai_signature", False),
                "editing_software_found": suspicion_result.get("editing_software", False),
                "description": "Analyzes EXIF/metadata for authenticity indicators",
            },
        }

    def _extract_exif(self, pil_image: Image.Image) -> dict:
        """Extract EXIF data from image."""
        exif_data = {}

        try:
            raw_exif = pil_image._getexif()
            if raw_exif is None:
                return {}

            for tag_id, value in raw_exif.items():
                tag_name = TAGS.get(tag_id, str(tag_id))

                # Handle GPS data
                if tag_name == "GPSInfo":
                    gps_data = {}
                    for gps_key, gps_val in value.items():
                        gps_tag = GPSTAGS.get(gps_key, str(gps_key))
                        gps_data[gps_tag] = str(gps_val)
                    exif_data["GPSInfo"] = gps_data
                elif isinstance(value, bytes):
                    try:
                        exif_data[tag_name] = value.decode("utf-8", errors="replace")
                    except Exception:
                        exif_data[tag_name] = f"<binary {len(value)} bytes>"
                else:
                    exif_data[tag_name] = str(value)

        except Exception:
            pass

        return exif_data

    def _analyze_suspicion(self, exif_data: dict) -> dict:
        """Analyze metadata for suspicious indicators."""
        score = 0.0
        flags = []

        has_camera = False
        has_gps = False
        has_thumbnail = False
        software = "None"
        ai_signature = False
        editing_software = False

        if not exif_data:
            flags.append("⚠️ No EXIF metadata found - common in AI-generated or heavily processed images")
            score += 0.4
        else:
            # Check for camera information
            camera_fields = ["Make", "Model", "LensModel", "LensMake"]
            camera_found = any(field in exif_data for field in camera_fields)
            has_camera = camera_found

            if not camera_found:
                flags.append("⚠️ No camera make/model information")
                score += 0.15
            else:
                flags.append(
                    f"✅ Camera detected: {exif_data.get('Make', '')} {exif_data.get('Model', '')}".strip()
                )
                score -= 0.1

            # Check for GPS
            if "GPSInfo" in exif_data:
                has_gps = True
                flags.append("✅ GPS location data present")
                score -= 0.05
            else:
                flags.append("ℹ️ No GPS data (may have been stripped for privacy)")

            # Check for date/time
            datetime_fields = ["DateTime", "DateTimeOriginal", "DateTimeDigitized"]
            has_datetime = any(field in exif_data for field in datetime_fields)

            if has_datetime:
                flags.append(f"✅ Timestamp: {exif_data.get('DateTimeOriginal', exif_data.get('DateTime', 'N/A'))}")
                score -= 0.05
            else:
                flags.append("⚠️ No timestamp information")
                score += 0.1

            # Check software
            sw = exif_data.get("Software", "").lower()
            if sw:
                software = exif_data.get("Software", "Unknown")

                # Check for AI signatures
                for sig in self.AI_SOFTWARE_SIGNATURES:
                    if sig in sw:
                        ai_signature = True
                        flags.append(f"🚨 AI generation software detected: {software}")
                        score += 0.5
                        break

                # Check for editing software
                if not ai_signature:
                    for editor in self.EDITING_SOFTWARE:
                        if editor in sw:
                            editing_software = True
                            flags.append(f"⚠️ Image editing software detected: {software}")
                            score += 0.15
                            break

                if not ai_signature and not editing_software:
                    flags.append(f"ℹ️ Software: {software}")

            # Check for thumbnail
            if "JPEGThumbnail" in exif_data or "ThumbnailImage" in exif_data:
                has_thumbnail = True
                flags.append("✅ Embedded thumbnail present (typical of real photos)")
                score -= 0.05

            # Check exposure settings (real cameras set these)
            exposure_fields = [
                "ExposureTime", "FNumber", "ISOSpeedRatings",
                "FocalLength", "ExposureProgram"
            ]
            exposure_count = sum(1 for f in exposure_fields if f in exif_data)

            if exposure_count >= 3:
                flags.append(
                    f"✅ Camera exposure data present ({exposure_count}/{len(exposure_fields)} fields)"
                )
                score -= 0.1
            elif exposure_count > 0:
                flags.append(
                    f"ℹ️ Partial exposure data ({exposure_count}/{len(exposure_fields)} fields)"
                )
            else:
                flags.append("⚠️ No exposure/camera settings found")
                score += 0.1

        score = max(0.05, min(0.95, score))

        return {
            "score": score,
            "flags": flags,
            "has_camera": has_camera,
            "has_gps": has_gps,
            "has_thumbnail": has_thumbnail,
            "software": software,
            "ai_signature": ai_signature,
            "editing_software": editing_software,
        }
