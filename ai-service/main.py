"""
StreetCheck AI Micro-Service
Phase 0 skeleton — classify and detect endpoints are stubs.
Full implementation in Phase 5.
"""

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import time

from src.schemas import ClassifyRequest, ClassifyResponse, DetectRequest, DetectResponse

app = FastAPI(
    title="StreetCheck AI Service",
    description="NLP classification and CV hazard detection micro-service",
    version="0.1.0",
)

# Only allow calls from the Express backend
ALLOWED_ORIGINS = [os.getenv("SERVER_URL", "http://localhost:5000")]
AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "dev-secret")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def _verify_token(token: str | None) -> None:
    if token != AI_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.get("/health")
async def health() -> dict:
    return {
        "status": "healthy",
        "models": {
            "nlp": "stub",
            "clip": "stub",
            "yolov8": "stub",
        },
        "uptime": int(time.time()),
        "phase": "0-scaffold",
    }


@app.post("/classify", response_model=ClassifyResponse)
async def classify(
    request: ClassifyRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> ClassifyResponse:
    """
    Phase 0 stub — always returns None (no suggestion).
    Full HuggingFace zero-shot implementation in Phase 5.
    """
    _verify_token(x_internal_token)
    return ClassifyResponse(
        suggestedType=None,
        confidence=0.0,
        allScores={},
        model="stub",
        processingMs=0,
    )


@app.post("/detect", response_model=DetectResponse)
async def detect(
    request: DetectRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> DetectResponse:
    """
    Phase 0 stub — always returns None (no detection).
    Full Claude Vision + CLIP + YOLOv8 pipeline in Phase 5.
    """
    _verify_token(x_internal_token)
    return DetectResponse(
        suggestedType=None,
        confidence=0.0,
        fallbackUsed=False,
        model="stub",
        reasoning=None,
        processingMs=0,
    )
