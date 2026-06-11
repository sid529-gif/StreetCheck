"""CV hazard detector — Claude Vision primary, URL-pattern heuristic fallback."""

import base64
import json
import logging
import os
from typing import Optional

import httpx

log = logging.getLogger("streetcheck-ai.cv")

# ── Constants ──────────────────────────────────────────────────────────────────

VALID_TYPES = {
    "pothole",
    "broken_streetlight",
    "waterlogging",
    "construction_debris",
    "stray_animals",
    "broken_footpath",
    "open_manhole",
}


# ── Warm-up ────────────────────────────────────────────────────────────────────

def warm_up_cv() -> None:
    """Prepare CV detector (no-op since offline heuristic fallback is used)."""
    log.info("[cv] Heuristic fallback CV detector ready.")


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _fetch_image_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


def _media_type_from_url(url: str) -> str:
    low = url.lower().split("?")[0]
    if low.endswith(".png"):
        return "image/png"
    if low.endswith(".webp"):
        return "image/webp"
    if low.endswith(".gif"):
        return "image/gif"
    return "image/jpeg"


# ── Claude Vision path ─────────────────────────────────────────────────────────

async def _detect_with_claude(photo_url: str) -> Optional[dict]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        from anthropic import AsyncAnthropic

        image_bytes = await _fetch_image_bytes(photo_url)
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        media_type = _media_type_from_url(photo_url)

        client = AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            temperature=0.0,
            system="You are a road safety hazard detector. Do not discuss crime or policing.",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": b64},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Identify the road safety hazard in this image.\n"
                                "Choose EXACTLY one type:\n"
                                "pothole | broken_streetlight | waterlogging | "
                                "construction_debris | stray_animals | broken_footpath | open_manhole\n\n"
                                "Return ONLY raw JSON (no markdown, no extra text):\n"
                                '{"hazardType":"<type>","confidence":<0.0-1.0>,"description":"<short description>"}'
                            ),
                        },
                    ],
                }
            ],
        )
        data = json.loads(response.content[0].text.strip())
        hz = data.get("hazardType", "")
        if hz in VALID_TYPES:
            return {
                "hazardType": hz,
                "confidence": round(float(data.get("confidence", 0.9)), 2),
                "description": data.get("description", f"Detected {hz}"),
                "fallbackUsed": False,
                "model": "claude-3-5-sonnet-20241022",
            }
    except Exception as exc:
        log.warning("[cv] Claude Vision failed (%s) — falling back to Heuristics.", exc)
    return None


# ── Heuristic fallback ─────────────────────────────────────────────────────────

async def _detect_with_heuristic(photo_url: str) -> dict:
    """Heuristic image URL matcher fallback when Claude Vision is offline or fails."""
    url_lower = photo_url.lower()
    
    # Try matching hazard types from substrings in image URL/filename
    matched_type = None
    
    mapping = {
        "waterlogging": ["water", "flood", "rain", "puddle", "waterlogging"],
        "open_manhole": ["manhole", "drain"],
        "broken_streetlight": ["streetlight", "street-light", "dark", "light"],
        "construction_debris": ["debris", "construction", "sand", "gravel", "brick", "stone"],
        "stray_animals": ["animal", "dog", "cow", "cattle", "monkey", "stray"],
        "broken_footpath": ["footpath", "sidewalk", "pavement", "broken-path"],
        "pothole": ["pothole", "pit", "crater", "hole", "bump"]
    }
    
    for hazard, tokens in mapping.items():
        if any(token in url_lower for token in tokens):
            matched_type = hazard
            break
            
    if not matched_type:
        matched_type = "pothole"
        confidence = 0.5
    else:
        confidence = 0.75
        
    return {
        "hazardType": matched_type,
        "confidence": confidence,
        "description": f"Heuristic URL matching detected potential {matched_type} hazard.",
        "fallbackUsed": True,
        "model": "heuristic-url-matcher",
    }


# ── Public entry point ─────────────────────────────────────────────────────────

async def detect_photo(photo_url: str) -> dict:
    """Detect hazard using Claude Vision (primary) → Heuristic URL classifier (fallback)."""
    result = await _detect_with_claude(photo_url)
    if result is not None:
        return result
    return await _detect_with_heuristic(photo_url)
