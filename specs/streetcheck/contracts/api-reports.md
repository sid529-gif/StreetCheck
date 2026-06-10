# API Contracts: Reports

**Base URL**: `/api/reports`
**Auth**: Anonymous reporter token in request body
**Validation**: Zod schemas from `shared/src/schemas/report.ts`

---

## POST /api/reports

Submit a new hazard report. Triggers immediate segment score update and increments `active_report_count`.

### Request Body

```json
{
  "segmentId": "hyd_12345678",
  "tapLocation": {
    "lat": 17.4326,
    "lng": 78.3862
  },
  "hazardType": "waterlogging",
  "confirmedType": "waterlogging",
  "description": "Huge puddle under the underpass — cars are stuck",
  "photoUrl": "https://res.cloudinary.com/streetcheck/image/upload/v1234/report_abc123.jpg",
  "aiSuggestedType": "waterlogging",
  "reporterToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Request Body Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `segmentId` | `string \| null` | ❌ | If null, server snaps to nearest segment within 100m of `tapLocation` |
| `tapLocation` | `{ lat: number, lng: number }` | ✅ | Exact map tap coordinates |
| `hazardType` | `HazardType` | ✅ | One of 7 enum values (must match `confirmedType`) |
| `confirmedType` | `HazardType` | ✅ | The type the user confirmed after any AI suggestion |
| `description` | `string` | ❌ | Max 500 characters |
| `photoUrl` | `string` | ❌ | Cloudinary secure URL (client uploads separately, sends URL here) |
| `aiSuggestedType` | `HazardType \| null` | ❌ | AI pipeline suggestion before user confirmation |
| `reporterToken` | `string` | ✅ | Client-generated anonymous UUID from localStorage |

### HazardType Enum

```
"pothole" | "broken_streetlight" | "waterlogging" | "construction_debris" | "stray_animals" | "broken_footpath" | "open_manhole"
```

### Response: `201 Created`

```json
{
  "reportId": "7f3c2a1b-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
  "segmentId": "hyd_12345678",
  "confirmedType": "waterlogging",
  "severityWeight": 0.3,
  "expiresAt": "2026-06-11T18:30:00Z",
  "updatedSegment": {
    "segmentId": "hyd_12345678",
    "safetyScore": 0.614,
    "safetyBand": "amber",
    "activeReportCount": 3
  }
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_HAZARD_TYPE` | `confirmedType` not in enum |
| `400 Bad Request` | `NO_SEGMENT_FOUND` | Snap failed — no segment within 100m of `tapLocation` |
| `400 Bad Request` | `INVALID_LOCATION` | Coordinates outside Hyderabad bounding box |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | `reporterToken` submitted >5 reports in 10 minutes |
| `500 Internal Server Error` | `REPORT_SAVE_FAILED` | Database error |

---

## GET /api/reports

Fetch all active hazard reports within a map viewport, for rendering as map pins.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `bbox` | `string` | ✅ | Bounding box: `minLng,minLat,maxLng,maxLat` |
| `hazardType` | `HazardType` | ❌ | Filter by specific hazard type |

### Example Request

```http
GET /api/reports?bbox=78.36,17.38,78.42,17.48
```

### Response: `200 OK`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [78.3862, 17.4326]
      },
      "properties": {
        "reportId": "7f3c2a1b-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
        "segmentId": "hyd_12345678",
        "hazardType": "waterlogging",
        "hasPhoto": true,
        "createdAt": "2026-06-10T18:30:00Z",
        "expiresAt": "2026-06-11T18:30:00Z",
        "minutesAgo": 12
      }
    }
  ],
  "meta": {
    "count": 1,
    "bbox": [78.36, 17.38, 78.42, 17.48]
  }
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_BBOX` | Malformed bounding box |

---

## POST /api/ai/classify-text (internal proxy)

Proxies to the Python AI micro-service for NLP hazard type classification of free text.

### Request Body

```json
{
  "text": "there's a huge pothole near the signal, very dangerous at night"
}
```

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
  }
}
```

> If `confidence < 0.65`, no suggestion is applied — the icon grid remains unselected.

---

## POST /api/ai/detect-photo (internal proxy)

Proxies to the Python AI micro-service for computer vision hazard detection.

### Request Body

```json
{
  "photoUrl": "https://res.cloudinary.com/streetcheck/image/upload/v1234/report_abc123.jpg"
}
```

### Response: `200 OK`

```json
{
  "suggestedType": "waterlogging",
  "confidence": 0.91,
  "fallbackUsed": false,
  "model": "claude-vision"
}
```

| `model` value | Meaning |
|---|---|
| `"claude-vision"` | Claude Vision API was used (primary path) |
| `"clip"` | CLIP zero-shot was used (Claude confidence < 0.65) |
| `"yolov8"` | YOLOv8 was used (CLIP also below threshold) |

> If all models return `confidence < 0.65`, `suggestedType` is `null` and the icon grid remains unselected.
