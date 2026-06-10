# API Contracts: Segments

**Base URL**: `/api/segments`
**Auth**: None (public endpoints for v1)
**Validation**: Zod schemas from `shared/src/schemas/segment.ts`

---

## GET /api/segments

Fetch road segments within a map viewport bounding box. Returns a GeoJSON FeatureCollection suitable for direct use with Leaflet's `L.geoJSON()`.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `bbox` | `string` | ✅ | Bounding box: `minLng,minLat,maxLng,maxLat` (comma-separated WGS84 coords) |
| `band` | `"green" \| "amber" \| "red"` | ❌ | Filter by safety band. Returns all bands if omitted. |

### Example Request

```http
GET /api/segments?bbox=78.36,17.38,78.42,17.48
```

### Response: `200 OK`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[78.385, 17.432], [78.387, 17.435]]
      },
      "properties": {
        "segmentId": "hyd_12345678",
        "osmWayId": 12345678,
        "name": "Road No. 12, Banjara Hills",
        "lightingScore": 0.72,
        "accidentRate": 0.18,
        "floodRisk": 0.40,
        "surfaceQuality": 0.85,
        "walkabilityScore": 0.60,
        "safetyScore": 0.682,
        "safetyBand": "amber",
        "activeReportCount": 2,
        "lastUpdated": "2026-06-10T18:30:00Z",
        "dataSources": ["osm", "morth_2024"]
      }
    }
  ],
  "meta": {
    "count": 1,
    "bbox": [78.36, 17.38, 78.42, 17.48],
    "dataAge": {
      "osm": "2026-06-10T18:15:00Z"
    }
  }
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_BBOX` | `bbox` parameter missing, malformed, or outside Hyderabad bounds |
| `500 Internal Server Error` | `SPATIAL_QUERY_FAILED` | PostGIS query error |

---

## GET /api/segments/:segmentId

Fetch a single segment's full score breakdown plus its active citizen reports.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `segmentId` | `string` | ✅ | Segment ID (format: `hyd_{osm_way_id}`) |

### Example Request

```http
GET /api/segments/hyd_12345678
```

### Response: `200 OK`

```json
{
  "segmentId": "hyd_12345678",
  "osmWayId": 12345678,
  "name": "Road No. 12, Banjara Hills",
  "geometry": {
    "type": "LineString",
    "coordinates": [[78.385, 17.432], [78.387, 17.435]]
  },
  "scores": {
    "overall": 68,
    "band": "amber",
    "breakdown": {
      "lighting": { "score": 72, "weight": 0.30, "source": "osm" },
      "accident": { "score": 82, "weight": 0.25, "source": "morth_2024" },
      "flood":    { "score": 60, "weight": 0.20, "source": "hydraa_2026" },
      "surface":  { "score": 85, "weight": 0.15, "source": "osm" },
      "walkability": { "score": 60, "weight": 0.10, "source": "osm" }
    }
  },
  "activeReports": [
    {
      "reportId": "550e8400-e29b-41d4-a716-446655440000",
      "hazardType": "waterlogging",
      "confirmedType": "waterlogging",
      "createdAt": "2026-06-10T17:45:00Z",
      "expiresAt": "2026-06-11T17:45:00Z",
      "hasPhoto": true
    }
  ],
  "scoringVersion": 1,
  "lastUpdated": "2026-06-10T18:30:00Z",
  "dataSources": ["osm", "morth_2024", "hydraa_2026", "user_report"]
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `404 Not Found` | `SEGMENT_NOT_FOUND` | No segment with this ID exists |
| `400 Bad Request` | `INVALID_SEGMENT_ID` | ID format is invalid |
