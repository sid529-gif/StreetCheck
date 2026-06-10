# API Contracts: AI Endpoints

**Base URL**: `/api/ai`
**Auth**: None (Claude API key is server-side only — never exposed to client)
**Model**: `claude-sonnet-4-20250514` for all calls
**Validation**: Zod schemas from `shared/src/schemas/ai.ts`

---

## POST /api/ai/assistant

Conversational safety assistant. Accepts a natural language question about road safety in Hyderabad. The server geocodes any location keywords in the message, fetches the top 20 nearest road segments, and injects their score data as structured context into the Claude system prompt.

### Request Body

```json
{
  "message": "Is it safe to walk to Banjara Hills at 10pm tonight?",
  "contextSegmentIds": ["hyd_12345678", "hyd_87654321"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | ✅ | User's natural language question. Max 500 chars. |
| `contextSegmentIds` | `string[]` | ❌ | Optional: pre-specify segments to include in context (e.g., segments currently visible in the viewport). Server also adds geocoded segments from the message. Max 20 total. |

### Claude System Prompt Template

```
You are StreetCheck Safety Assistant, a road safety advisor for Hyderabad, India.
You have access to real-time safety scores for road segments in Hyderabad.

STRICT RULES:
1. Only discuss road safety topics: lighting, road surface, flooding, footpath quality, potholes, and general pedestrian/cycling safety.
2. NEVER discuss crime, policing, law enforcement, or neighbourhood safety in a social sense.
3. NEVER discuss areas outside Hyderabad city limits.
4. Base your answers on the segment data provided below. Do not speculate beyond this data.
5. If you cannot find relevant segment data for the location asked about, say so clearly.
6. Keep responses concise — 2-4 sentences maximum.

CURRENT SEGMENT DATA:
{segmentContextJSON}

CURRENT TIME: {currentTime}
```

### Response: `200 OK`

```json
{
  "response": "Road No. 12 in Banjara Hills has a lighting score of 72/100 and no active hazard reports. However, the underpass near Road No. 8 has a flood risk of 4/10 due to recent waterlogging reports from earlier today — consider avoiding it if it has been raining. The main road surface is rated 85/100, making it generally comfortable for walking.",
  "segmentsUsed": ["hyd_12345678", "hyd_87654321"],
  "dataAge": "2026-06-10T18:15:00Z"
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `400 Bad Request` | `MESSAGE_TOO_LONG` | Message exceeds 500 characters |
| `503 Service Unavailable` | `AI_UNAVAILABLE` | Claude API error or timeout |
| `400 Bad Request` | `TOPIC_OUT_OF_SCOPE` | Detected sensitive topic (crime etc.) — pre-filter before Claude call |

---

## POST /api/ai/summary

Generate a 2-line natural language safety summary for a specific road segment. Called when a user taps a segment on the map and the detail card opens.

### Request Body

```json
{
  "segmentId": "hyd_12345678"
}
```

### Claude Prompt Template

```
Generate a 2-sentence road safety summary for this segment. 
Be specific about the main risk and any active citizen reports.
Do not mention crime or policing.
Format: Plain text, no markdown, no bullet points.

Segment: {segmentName}
Safety Score: {safetyScore}/100 ({safetyBand})
Lighting: {lightingScore}/100
Flood Risk: {floodRisk}/100
Surface Quality: {surfaceQuality}/100
Walkability: {walkabilityScore}/100
Active Reports: {activeReportCount} ({reportTypes})
Last Updated: {lastUpdated}
```

### Response: `200 OK`

```json
{
  "summary": "This stretch has poor lighting (72/100) and 3 recent pothole reports — surface quality is currently rated 45/100. Pedestrian use after 8pm is not recommended due to limited visibility and uneven road surface.",
  "segmentId": "hyd_12345678"
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `404 Not Found` | `SEGMENT_NOT_FOUND` | Segment ID does not exist |
| `503 Service Unavailable` | `AI_UNAVAILABLE` | Claude API error |

---

## POST /api/ai/explanation

Generate a comparative explanation of why the safest route is safer than the fastest route. Shown below the route comparison panel after a user requests route options.

### Request Body

```json
{
  "fastestRoute": {
    "label": "Fastest",
    "totalDistanceM": 3200,
    "estimatedTimeFormatted": "12 min",
    "overallSafetyScore": 54,
    "safetyBand": "amber",
    "segmentIds": ["hyd_11111111", "hyd_22222222"],
    "hazardSummary": {
      "redSegments": 1,
      "amberSegments": 2,
      "greenSegments": 0,
      "activeReports": 3
    }
  },
  "safestRoute": {
    "label": "Safest",
    "totalDistanceM": 4100,
    "estimatedTimeFormatted": "16 min",
    "overallSafetyScore": 81,
    "safetyBand": "green",
    "segmentIds": ["hyd_44444444", "hyd_55555555"],
    "hazardSummary": {
      "redSegments": 0,
      "amberSegments": 1,
      "greenSegments": 2,
      "activeReports": 0
    }
  }
}
```

### Claude Prompt Template

```
Compare these two routes from a road safety perspective. Explain in 2-3 sentences 
why the safer route scores higher. Be specific — mention actual hazards, not just scores.
Do not mention crime. Do not use markdown.

Fastest Route (Score: {fastScore}/100, {fastTime}): 
- {fastRed} red segments, {fastAmber} amber, {fastReports} active hazard reports
- Worst segment: {worstSegmentName} ({worstSegmentIssue})

Safest Route (Score: {safeScore}/100, {safeTime}):
- {safeRed} red segments, {safeAmber} amber, {safeReports} active hazard reports  
- Best feature: {bestSegmentName} ({bestSegmentStrength})

Context: Hyderabad, current time {currentTime}, weather: {weatherContext}
```

### Response: `200 OK`

```json
{
  "explanation": "Route B avoids a flood-prone underpass near Tolichowki that has 2 active waterlogging reports from this evening. It also maintains continuous footpath coverage for 80% of its length and has no unlit stretches, unlike Route A which passes through a 400-metre unlit road near the junction. The extra 4 minutes is well worth the safety gain tonight."
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| `400 Bad Request` | `MISSING_ROUTES` | Both route objects must be provided |
| `503 Service Unavailable` | `AI_UNAVAILABLE` | Claude API error |
