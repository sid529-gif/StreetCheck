"""
StreetCheck AI Micro-Service — Phase 4

Exposes:
  POST /classify  — NLP hazard classification (Claude → BART fallback)
  POST /detect    — CV hazard detection from photo URL (Claude Vision → CLIP fallback)
  GET  /health    — Service health check

Authentication: X-Service-Secret header must match AI_SERVICE_SECRET env var.
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator
import asyncio
import logging
import os
import time

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.schemas import ClassifyRequest, ClassifyResponse, DetectRequest, DetectResponse
from src.models.nlp_classifier import warm_up_nlp, classify_text
from src.models.cv_detector import warm_up_cv, detect_photo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("streetcheck-ai")

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "dev-secret")
ALLOWED_ORIGINS = [os.getenv("SERVER_URL", "http://localhost:5000")]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Warm-up HuggingFace models in a thread pool so the event loop stays free."""
    log.info("[startup] Warming up HuggingFace NLP + CV models ...")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, warm_up_nlp)
    await loop.run_in_executor(None, warm_up_cv)
    log.info("[startup] All models ready — service is accepting requests.")
    yield
    log.info("[shutdown] AI service shutting down.")


app = FastAPI(
    title="StreetCheck AI Service",
    description="NLP classification and CV hazard detection micro-service",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def _verify_secret(secret: str | None) -> None:
    if not secret or secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing X-Service-Secret")


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {
        "status": "healthy",
        "models": {"nlp": "ready", "clip": "ready"},
        "uptime": int(time.time()),
        "phase": "4-ai-service",
    }


# ── Classify ───────────────────────────────────────────────────────────────────

@app.post("/classify", response_model=ClassifyResponse, tags=["ai"])
async def classify(
    request: ClassifyRequest,
    x_service_secret: str | None = Header(default=None, alias="X-Service-Secret"),
) -> ClassifyResponse:
    """NLP hazard classification from text description."""
    _verify_secret(x_service_secret)
    t0 = time.perf_counter()
    result = await classify_text(request.text)
    ms = int((time.perf_counter() - t0) * 1000)
    log.info("[classify] %s (%.2f) via %s in %dms", result["hazardType"], result["confidence"], result["model"], ms)
    return ClassifyResponse(
        hazardType=result["hazardType"],
        confidence=result["confidence"],
        severityWeight=result["severityWeight"],
        model=result["model"],
        processingMs=ms,
    )


# ── Detect ─────────────────────────────────────────────────────────────────────

@app.post("/detect", response_model=DetectResponse, tags=["ai"])
async def detect(
    request: DetectRequest,
    x_service_secret: str | None = Header(default=None, alias="X-Service-Secret"),
) -> DetectResponse:
    """CV hazard detection from a Cloudinary photo URL."""
    _verify_secret(x_service_secret)
    url = request.photoUrl or request.photo_url
    if not url:
        raise HTTPException(status_code=422, detail="photoUrl or photo_url is required")
    t0 = time.perf_counter()
    result = await detect_photo(url)
    ms = int((time.perf_counter() - t0) * 1000)
    log.info("[detect] %s (%.2f) via %s in %dms", result["hazardType"], result["confidence"], result["model"], ms)
    return DetectResponse(
        hazardType=result["hazardType"],
        confidence=result["confidence"],
        description=result["description"],
        fallbackUsed=result["fallbackUsed"],
        model=result["model"],
        processingMs=ms,
    )
