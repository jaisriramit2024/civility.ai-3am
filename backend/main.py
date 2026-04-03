"""
AI Image Analyzer - FastAPI Backend
Main application server with modular detection pipeline.
"""

import time
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from modules.preprocessing import ImagePreprocessor
from modules.ai_detection import AIDetector
from modules.tampering_detection import TamperingDetector
from modules.metadata_analysis import MetadataAnalyzer
from modules.hash_matching import HashMatcher
from modules.content_moderation import ContentModerator
from modules.scoring import ScoringEngine

app = FastAPI(
    title="AI Image Analyzer",
    description="Multi-layer image analysis pipeline for detecting AI-generated, manipulated, and authentic images.",
    version="1.0.0",
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detection modules
ai_detector = AIDetector()
tampering_detector = TamperingDetector()
metadata_analyzer = MetadataAnalyzer()
hash_matcher = HashMatcher()
content_moderator = ContentModerator()

# Max file size: 20MB
MAX_FILE_SIZE = 20 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/bmp", "image/tiff", "image/gif",
}


@app.get("/")
async def root():
    return {
        "name": "AI Image Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "/api/analyze": "POST - Full image analysis pipeline",
            "/api/health": "GET - Health check",
        },
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "modules": [
        "preprocessing", "ai_detection", "tampering_detection",
        "metadata_analysis", "hash_matching", "content_moderation", "scoring"
    ]}


@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Full image analysis pipeline.
    Runs all detection modules and returns combined results.
    """
    start_time = time.time()

    # Validate file type
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Read file
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f}MB",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        # Step 1: Preprocess
        preprocessed = ImagePreprocessor.prepare_for_analysis(file_bytes)
        image_info = preprocessed["info"]

        # Step 2: AI Detection
        ai_result = ai_detector.analyze(
            preprocessed["np_resized"],
            preprocessed["pil_resized"],
        )

        # Step 3: Tampering Detection
        tampering_result = tampering_detector.analyze(
            preprocessed["pil_original"],
            preprocessed["np_original"],
        )

        # Step 4: Metadata Analysis
        metadata_result = metadata_analyzer.analyze(preprocessed["pil_original"])

        # Step 5: Hash Matching
        hash_result = hash_matcher.analyze(preprocessed["pil_original"])

        # Step 6: Content Moderation (Nudity, Violence, Gore)
        content_result = content_moderator.analyze(
            preprocessed["np_original"],
            preprocessed["pil_original"],
        )

        # Step 7: Scoring & Classification
        final_verdict = ScoringEngine.classify(
            ai_score=ai_result["ai_generated_score"],
            tampering_score=tampering_result["tampering_score"],
            metadata_score=metadata_result["metadata_score"],
            hash_score=hash_result["hash_score"],
            content_safety_score=content_result["content_safety_score"],
        )

        elapsed = round(time.time() - start_time, 3)

        return JSONResponse(
            content={
                "success": True,
                "analysis_time_seconds": elapsed,
                "filename": file.filename,
                "image_info": image_info,
                "verdict": final_verdict,
                "modules": {
                    "ai_detection": ai_result,
                    "tampering_detection": {
                        "tampering_score": tampering_result["tampering_score"],
                        "ela_heatmap": tampering_result.get("ela_heatmap"),
                        "details": tampering_result["details"],
                    },
                    "metadata_analysis": metadata_result,
                    "hash_matching": hash_result,
                    "content_moderation": content_result,
                },
            }
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
