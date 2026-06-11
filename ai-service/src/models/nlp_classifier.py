"""NLP hazard classifier — Claude primary, offline keyword matcher fallback."""

import json
import logging
import os
from typing import Optional

log = logging.getLogger("streetcheck-ai.nlp")

# ── Constants ──────────────────────────────────────────────────────────────────

SEVERITY_WEIGHTS: dict[str, float] = {
    "waterlogging": 0.9,
    "open_manhole": 0.85,
    "broken_streetlight": 0.7,
    "construction_debris": 0.65,
    "pothole": 0.6,
    "broken_footpath": 0.5,
    "stray_animals": 0.4,
}

VALID_TYPES = set(SEVERITY_WEIGHTS.keys())


# ── Warm-up ────────────────────────────────────────────────────────────────────

def warm_up_nlp() -> None:
    """Prepare NLP classifier (no-op since offline heuristic fallback is used)."""
    log.info("[nlp] Heuristic fallback NLP classifier ready.")


# ── Claude path ────────────────────────────────────────────────────────────────

async def _classify_with_claude(text: str) -> Optional[dict]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            temperature=0.0,
            system=(
                "You are a civic road safety assistant for Hyderabad. "
                "Do not discuss crime or policing. Do not discuss areas outside Hyderabad."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f'Classify this road hazard description: "{text}"\n\n'
                        "Choose EXACTLY one type:\n"
                        "pothole | broken_streetlight | waterlogging | "
                        "construction_debris | stray_animals | broken_footpath | open_manhole\n\n"
                        "Return ONLY raw JSON (no markdown, no extra text):\n"
                        '{"hazardType":"<type>","confidence":<0.0-1.0>}'
                    ),
                }
            ],
        )
        data = json.loads(response.content[0].text.strip())
        hz = data.get("hazardType", "")
        if hz in VALID_TYPES:
            conf = float(data.get("confidence", 0.9))
            return {
                "hazardType": hz,
                "confidence": round(conf, 2),
                "severityWeight": SEVERITY_WEIGHTS[hz],
                "model": "claude-3-5-sonnet-20241022",
            }
    except Exception as exc:
        log.warning("[nlp] Claude failed (%s) — falling back to Heuristics.", exc)
    return None


# ── Heuristic fallback ─────────────────────────────────────────────────────────

def _classify_with_hf(text: str) -> dict:
    """Heuristic keyword matching fallback when Claude is offline or fails."""
    text_lower = text.lower()
    
    # Simple keyword mappings
    keywords = {
        "waterlogging": ["water", "flood", "rain", "puddle", "drain", "logging", "clog"],
        "open_manhole": ["manhole", "open drain", "chamber", "gutter hole"],
        "broken_streetlight": ["street light", "streetlight", "dark", "lamp", "light", "illumination", "night"],
        "construction_debris": ["debris", "construction", "sand", "gravel", "cement", "brick", "stone", "pile"],
        "stray_animals": ["animal", "dog", "cow", "cattle", "monkey", "stray"],
        "broken_footpath": ["footpath", "sidewalk", "pavement", "walk", "broken path", "tile"],
        "pothole": ["pothole", "pit", "crater", "hollow", "hole", "bump"]
    }
    
    matched_type = None
    max_matches = 0
    
    for hazard, words in keywords.items():
        matches = sum(1 for w in words if w in text_lower)
        if matches > max_matches:
            max_matches = matches
            matched_type = hazard
            
    # Default if no keywords matched
    if not matched_type:
        matched_type = "pothole"
        confidence = 0.5
    else:
        confidence = min(0.6 + 0.1 * max_matches, 0.95)
        
    return {
        "hazardType": matched_type,
        "confidence": round(confidence, 2),
        "severityWeight": SEVERITY_WEIGHTS[matched_type],
        "model": "heuristic-matcher"
    }


# ── Public entry point ─────────────────────────────────────────────────────────

async def classify_text(text: str) -> dict:
    """Classify text using Claude (primary) → Heuristic keyword matcher (fallback)."""
    result = await _classify_with_claude(text)
    if result is not None:
        return result
    return _classify_with_hf(text)
