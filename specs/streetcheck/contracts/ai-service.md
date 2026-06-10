# API Contracts: AI Micro-Service (Python FastAPI)

**Base URL**: `http://localhost:8001` (Docker internal: `http://ai-service:8001`)
**Purpose**: Internal-only Python FastAPI service. Called exclusively by the Node.js `server/` — never directly from the client.
**Auth**: Shared secret header `X-Internal-Token` (env var `AI_SERVICE_SECRET`)

---

## POST /classify

Zero-shot NLP classification of free-text hazard descriptions. Uses HuggingFace `facebook/bart-large-mnli`.

### Request Body

```json
{
  "text": "there's a huge pothole near the signal, very dangerous at night"
}
```

| Field  | Type     | Required | Description                                               |
| ------ | -------- | -------- | --------------------------------------------------------- |
| `text` | `string` | ✅       | Free-text description from citizen report. Max 500 chars. |

### Response: `200 OK`

```json
{
  "suggestedType": "pothole",
  "confidence": 0.87,
  "allScores": {
    "pothole": 0.87,
    "broken_streetlight": 0.31,
    "waterlogging": 0.08,
    "construction_debris": 0.12,
    "stray_animals": 0.04,
    "broken_footpath": 0.09,
    "open_manhole": 0.15
  },
  "model": "facebook/bart-large-mnli",
  "processingMs": 340
}
```

> If `confidence < 0.65`, `suggestedType` is `null`. The Node server propagates this — no suggestion shown in the UI.

### Labels Used for Zero-Shot Classification

```python
HAZARD_LABELS = [
    "pothole in road",
    "broken streetlight",
    "waterlogged road or flooding",
    "construction debris on road",
    "stray animals on road",
    "broken or missing footpath",
    "open manhole"
]
```

Labels are mapped back to enum keys: `"pothole in road"` → `"pothole"`, etc.

### Error Responses

| Status                     | Code                         | Description |
| -------------------------- | ---------------------------- | ----------- |
| `400 Bad Request`          | Text field missing or empty  |
| `422 Unprocessable Entity` | Text exceeds 500 chars       |
| `503 Service Unavailable`  | HuggingFace model not loaded |

---

## POST /detect

Computer vision hazard detection from a photo URL. Primary model: Claude Vision API. Fallback: CLIP zero-shot. Second fallback: YOLOv8.

### Request Body

```json
{
  "imageUrl": "https://res.cloudinary.com/streetcheck/image/upload/v1234/report_abc123.jpg"
}
```

| Field      | Type     | Required | Description                                           |
| ---------- | -------- | -------- | ----------------------------------------------------- |
| `imageUrl` | `string` | ✅       | Publicly accessible image URL (Cloudinary secure URL) |

### Detection Pipeline

```
1. Download image from Cloudinary URL
2. Send to Claude Vision API with structured prompt:
   "Identify which of these road hazards is visible in the image:
    pothole, broken streetlight, waterlogging, construction debris,
    stray animals, broken footpath, open manhole.
    Respond with JSON: { hazardType: string | null, confidence: float, reasoning: string }
    If no hazard is clearly visible, set hazardType to null."
3. If Claude confidence >= 0.65 → return Claude result
4. Else → run CLIP zero-shot with prompts:
   ["broken streetlight pole", "waterlogged road", "pothole in asphalt",
    "construction debris", "stray dog on road", "broken concrete footpath", "open manhole"]
5. If CLIP confidence >= 0.65 → return CLIP result with fallbackUsed=true
6. Else → run YOLOv8 (pre-trained road hazard model)
7. If YOLOv8 detects object → map to nearest hazard label
8. If all fail → return { suggestedType: null, confidence: 0, fallbackUsed: true, model: "none" }
```

### Response: `200 OK`

```json
{
  "suggestedType": "waterlogging",
  "confidence": 0.91,
  "fallbackUsed": false,
  "model": "claude-vision",
  "reasoning": "The image clearly shows standing water approximately 10cm deep covering the road surface near an underpass structure.",
  "processingMs": 1240
}
```

| `model`           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `"claude-vision"` | Claude Vision API was used (primary)            |
| `"clip"`          | CLIP zero-shot (Claude < 0.65 threshold)        |
| `"yolov8"`        | YOLOv8 (Claude + CLIP both below threshold)     |
| `"none"`          | All models failed or returned < 0.65 confidence |

### Error Responses

| Status                     | Code                                           | Description |
| -------------------------- | ---------------------------------------------- | ----------- |
| `400 Bad Request`          | `imageUrl` missing or invalid URL format       |
| `422 Unprocessable Entity` | Image download failed (invalid URL, 404, etc.) |
| `413 Payload Too Large`    | Image exceeds 10MB                             |
| `503 Service Unavailable`  | All AI models unavailable                      |

---

## GET /health

Health check endpoint for Docker compose and server startup validation.

### Response: `200 OK`

```json
{
  "status": "healthy",
  "models": {
    "nlp": "loaded",
    "clip": "loaded",
    "yolov8": "loaded"
  },
  "uptime": 3600
}
```

---

## Pydantic Schemas (`ai-service/src/schemas.py`)

```python
from pydantic import BaseModel, HttpUrl
from typing import Optional

class ClassifyRequest(BaseModel):
    text: str  # max_length=500

class ClassifyResponse(BaseModel):
    suggestedType: Optional[str] = None
    confidence: float
    allScores: dict[str, float]
    model: str
    processingMs: int

class DetectRequest(BaseModel):
    imageUrl: HttpUrl

class DetectResponse(BaseModel):
    suggestedType: Optional[str] = None
    confidence: float
    fallbackUsed: bool
    model: str
    reasoning: Optional[str] = None
    processingMs: int
```
