"""Pydantic schemas for the StreetCheck AI micro-service."""

from pydantic import BaseModel, HttpUrl
from typing import Optional


HAZARD_TYPES = [
    "pothole",
    "broken_streetlight",
    "waterlogging",
    "construction_debris",
    "stray_animals",
    "broken_footpath",
    "open_manhole",
]


class ClassifyRequest(BaseModel):
    text: str  # max 500 chars enforced by validator


class ClassifyResponse(BaseModel):
    suggestedType: Optional[str] = None
    confidence: float
    allScores: dict[str, float]
    model: str
    processingMs: int


class DetectRequest(BaseModel):
    imageUrl: str  # Cloudinary HTTPS URL


class DetectResponse(BaseModel):
    suggestedType: Optional[str] = None
    confidence: float
    fallbackUsed: bool
    model: str
    reasoning: Optional[str] = None
    processingMs: int
