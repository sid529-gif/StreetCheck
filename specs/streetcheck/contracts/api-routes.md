# API Contracts: Routes

**Base URL**: `/api/routes`
**Auth**: None
**Validation**: Zod schemas from `shared/src/schemas/route.ts`

---

## POST /api/routes

Compute two route options between an origin and destination: the fastest (distance/time-optimised) and the safest (safety-score-optimised via graphology). Both points can be passed as lat/lng coordinates or as address strings (which are geocoded via Nominatim internally).

### Request Body

```json
{
  "origin": {
    "address": "Kondapur, Hyderabad",
    "lat": null,
    "lng": null
  },
  "destination": {
    "address": "Gachibowli, Hyderabad",
    "lat": null,
    "lng": null
  }
}
```

> Either `address` or `lat`+`lng` must be provided. If `lat`+`lng` are provided, geocoding is skipped.

### Request Body Schema

| Field                 | Type     | Required | Description                                     |
| --------------------- | -------- | -------- | ----------------------------------------------- |
| `origin.address`      | `string` | ❌       | Address string for Nominatim geocoding          |
| `origin.lat`          | `number` | ❌       | Latitude (WGS84) — skips geocoding if provided  |
| `origin.lng`          | `number` | ❌       | Longitude (WGS84) — skips geocoding if provided |
| `destination.address` | `string` | ❌       | Address string                                  |
| `destination.lat`     | `number` | ❌       | Latitude                                        |
| `destination.lng`     | `number` | ❌       | Longitude                                       |

### Response: `200 OK`

```json
{
  "fastest": {
    "label": "Fastest",
    "totalDistanceM": 3200,
    "estimatedTimeS": 720,
    "estimatedTimeFormatted": "12 min",
    "overallSafetyScore": 54,
    "safetyBand": "amber",
    "segmentIds": ["hyd_11111111", "hyd_22222222", "hyd_33333333"],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [78.364, 17.432],
        [78.374, 17.44],
        [78.384, 17.445]
      ]
    },
    "hazardSummary": {
      "redSegments": 1,
      "amberSegments": 2,
      "greenSegments": 0,
      "activeReports": 3
    }
  },
  "safest": {
    "label": "Safest",
    "totalDistanceM": 4100,
    "estimatedTimeS": 960,
    "estimatedTimeFormatted": "16 min",
    "overallSafetyScore": 81,
    "safetyBand": "green",
    "segmentIds": ["hyd_44444444", "hyd_55555555", "hyd_66666666"],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [78.364, 17.432],
        [78.368, 17.436],
        [78.38, 17.443]
      ]
    },
    "hazardSummary": {
      "redSegments": 0,
      "amberSegments": 1,
      "greenSegments": 2,
      "activeReports": 0
    }
  },
  "origin": {
    "address": "Kondapur, Hyderabad",
    "lat": 17.4326,
    "lng": 78.3642
  },
  "destination": {
    "address": "Gachibowli, Hyderabad",
    "lat": 17.445,
    "lng": 78.384
  }
}
```

### Route Safety Score Calculation

The `overallSafetyScore` for a route is the weighted average of all segment safety scores, weighted by segment length:

```
route_safety_score = Σ(segment.safetyScore × segment.lengthM) / Σ(segment.lengthM)
```

This ensures longer segments have proportionally more influence on the route score.

### Routing Algorithm

- **Fastest route**: graphology shortest path with edge weight = `segment.lengthM / segment.maxSpeedKmh` (proxy for travel time; `maxSpeedKmh` defaults to 30 for urban roads)
- **Safest route**: graphology shortest path with edge weight = `(1 - segment.safetyScore) × segment.lengthM` — minimises cumulative danger weighted by distance

### Error Responses

| Status                      | Code                        | Description                                                   |
| --------------------------- | --------------------------- | ------------------------------------------------------------- |
| `400 Bad Request`           | `GEOCODING_FAILED`          | Nominatim could not resolve one or both addresses             |
| `400 Bad Request`           | `ORIGIN_OUT_OF_BOUNDS`      | Origin coordinates outside Hyderabad bounding box             |
| `400 Bad Request`           | `DESTINATION_OUT_OF_BOUNDS` | Destination outside bounds                                    |
| `400 Bad Request`           | `NO_ROUTE_FOUND`            | Graphology found no path between origin and destination nodes |
| `400 Bad Request`           | `SAME_ORIGIN_DESTINATION`   | Origin and destination resolve to the same graph node         |
| `500 Internal Server Error` | `ROUTING_GRAPH_ERROR`       | Graphology internal error                                     |
| `503 Service Unavailable`   | `GRAPH_NOT_READY`           | Routing graph is still loading at server startup              |
