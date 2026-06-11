"""Pydantic schemas for the StreetCheck AI micro-service."""

from pydantic import BaseModel, Field
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
    text: str = Field(..., max_length=500)

class ClassifyResponse(BaseModel):
    hazardType: Optional[str] = None
    confidence: float
    severityWeight: Optional[float] = 0.5
    model: str
    processingMs: int

class DetectRequest(BaseModel):
    photoUrl: Optional[str] = None
    photo_url: Optional[str] = None

class DetectResponse(BaseModel):
    hazardType: Optional[str] = None
    confidence: float
    description: Optional[str] = None
    fallbackUsed: bool
    model: str
    processingMs: int
