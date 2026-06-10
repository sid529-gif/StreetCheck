# Feature Specification: StreetCheck — Civic Road Safety Intelligence Platform

**Feature Branch**: `feat/streetcheck-v1`

**Created**: 2026-06-10

**Status**: Draft

**Input**: Full project brief — StreetCheck Hackathon Project, Version 1.0, June 2026

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Route Safety Comparison (Priority: P1) 🎯 MVP

A commuter opens StreetCheck, enters an origin and destination, and receives two side-by-side route options: the fastest route (travel time optimised) and the safest route (safety-score optimised). Each route shows its composite safety score, estimated travel time, and a 1-line AI summary explaining why it scores the way it does. The user taps the safest route to view a per-segment breakdown before navigating.

**Why this priority**: This is the core differentiator of the product and the primary demo moment. It directly addresses the problem statement — no existing navigation tool provides safety-optimised routing. Without this, StreetCheck has no reason to exist.

**Independent Test**: Can be fully tested by entering "Kondapur" → "Gachibowli" on the map, receiving two route cards, verifying safety scores differ, and reading the AI route explanation — all without citizen reporting or conversational AI being present.

**Acceptance Scenarios**:

1. **Given** the user is on the StreetCheck map with the safety heatmap visible, **When** they enter a valid origin and destination within Hyderabad, **Then** they receive exactly two route options labelled "Fastest" and "Safest" with safety scores (0–100), estimated time, and colour bands (green/amber/red)
2. **Given** two route options are displayed, **When** the user taps the "Safest" route card, **Then** a per-segment panel opens showing individual sub-scores: lighting, accident_rate, flood_risk, surface_quality, walkability
3. **Given** a route comparison is shown, **When** the AI explanation loads, **Then** it correctly references at least one specific hazard present on the faster but less safe route (e.g., "Route A passes through an unlit stretch near Tolichowki")
4. **Given** the routing graph has no path between origin and destination, **When** the user submits, **Then** an error message appears: "No route found — try adjusting your start or end point"

---

### User Story 2 — Safety Heatmap View (Priority: P2)

A user opens the app and sees the city map overlaid with a colour-coded safety heatmap. Road segments are coloured green (75–100), amber (45–74), or red (0–44) based on their composite safety score. Tapping any segment shows a detail card with its score breakdown and any active citizen reports.

**Why this priority**: The heatmap is the immediate visual hook — the "wow" moment on first open. It also provides the data layer that routing depends on. Routing (P1) can be demoed with a simpler visual but the heatmap is what makes the product legible to non-technical judges.

**Independent Test**: Open the app, see the Hyderabad road network rendered with colour-coded segments, tap a segment, and read its score breakdown. No routing or reporting needed to validate this story.

**Acceptance Scenarios**:

1. **Given** the app loads for the first time, **When** the map initialises, **Then** road segments in the Hyderabad bounding box (17.2–17.6°N, 78.3–78.6°E) are visible and colour-coded green/amber/red within 3 seconds
2. **Given** the heatmap is displayed, **When** the user taps a road segment, **Then** a detail card appears showing: segment name, overall safety score, sub-scores for all 5 dimensions, number of active reports, and last-updated timestamp
3. **Given** a segment has safety_band = "red", **When** it is tapped, **Then** the detail card includes a caution message: "Avoid if possible, especially at night"
4. **Given** OSM data has not yet been fetched (first load), **When** the map renders, **Then** a loading skeleton is shown and a "Fetching road data…" toast appears

---

### User Story 3 — Citizen Hazard Reporting (Priority: P3)

A user taps a location on the map, selects a hazard type from an icon grid (pothole / broken streetlight / waterlogging / construction debris / stray animals / broken footpath / open manhole), optionally types a description or uploads a photo, and submits. The segment score updates immediately. The report is visible to other users as a pin on the map.

**Why this priority**: Citizen reporting is the real-time data layer that makes StreetCheck a living platform rather than a static snapshot. It demonstrates the Waze-like crowdsourcing model. However, the core value proposition (P1 + P2) can be demoed without it using seed data.

**Independent Test**: Tap a segment on the map, submit a "pothole" report, observe the safety score of that segment decrease, and see the report pin appear on the map — without routing or AI features being active.

**Acceptance Scenarios**:

1. **Given** the user taps a location on the map, **When** the report modal opens, **Then** an icon grid of 7 hazard types is displayed: pothole, broken streetlight, waterlogging, construction debris, stray animals, broken footpath, open manhole
2. **Given** the user selects a hazard type and taps "Submit", **When** the report is saved, **Then** the affected road segment's safety score updates within 2 seconds and the new score is reflected in the heatmap colour
3. **Given** the user uploads a photo with their report, **When** the AI CV pipeline processes it, **Then** a suggested hazard type is auto-selected in the icon grid (which the user can override before submitting)
4. **Given** a report is submitted, **When** other users view the same area, **Then** they see a report pin on the map with hazard type icon, timestamp, and report count
5. **Given** free text is entered in the description field, **When** the NLP classifier runs, **Then** the hazard type icon grid pre-selects the most likely type with a "Suggested" badge

---

### User Story 4 — Conversational Safety Assistant (Priority: P4)

A floating chat bubble on the map allows users to ask natural language safety questions about any area or route. The assistant is powered by Claude API with the relevant segment scores injected as context. Example queries: "Is it safe to walk to Banjara Hills at 10pm?", "Which route from Ameerpet to Madhapur has the best lighting?"

**Why this priority**: This is a differentiating AI feature that elevates StreetCheck beyond a data dashboard, but it is not blocking for the core demo. P1–P3 must ship first.

**Independent Test**: Open the chat bubble, type "Are there any flood-prone stretches near Mehdipatnam?", and receive a response that correctly references real segment flood_risk scores from the database.

**Acceptance Scenarios**:

1. **Given** the user taps the chat bubble, **When** the assistant opens, **Then** a "StreetCheck Safety Assistant" header appears with a suggested prompt: "Ask me about safety on any route or area in Hyderabad"
2. **Given** the user asks a route safety question, **When** Claude responds, **Then** the response references specific road segment names and their safety scores from the database context
3. **Given** the user asks about an area outside the Hyderabad bounding box, **When** Claude responds, **Then** it clarifies: "StreetCheck currently covers Hyderabad city only"
4. **Given** the Claude API is unavailable, **When** the user sends a message, **Then** a graceful error appears: "Safety Assistant is temporarily unavailable. Please try again shortly."

---

### Edge Cases

- What happens when a user submits a report for a road segment that does not exist in the database (e.g., a new road not yet in OSM)?
  - System should snap the report to the nearest known segment within 100m; if none found, store as a free-floating point report and notify the user.
- How does the system handle simultaneous rapid score updates from multiple citizen reports on the same segment?
  - Score updates must be debounced with a 5-second window; last-write-wins with a lock on the segment row.
- What if the Overpass API is rate-limited or down during a polling cycle?
  - The cron job must implement exponential backoff (1s → 2s → 4s → max 60s). Stale data is served with a "Data last updated: X minutes ago" notice in the UI.
- How does flood_risk score change during active monsoon vs dry season?
  - The HYDRAA shapefile provides a static base risk; citizen reports of "waterlogging" in the last 6 hours apply a +0.3 multiplier to the base flood_risk, capped at 1.0.
- What if the photo upload fails mid-submission?
  - The report must still be submittable without a photo. The CV pipeline runs only when a photo is present; its output is advisory, never blocking.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display road segments as a colour-coded safety heatmap over a Leaflet map for the Hyderabad bounding box (17.2–17.6°N, 78.3–78.6°E)
- **FR-002**: System MUST compute a composite safety score (0–100) for each road segment using the formula: `0.30 × lighting + 0.25 × (1 − accident_rate) + 0.20 × (1 − flood_risk) + 0.15 × surface_quality + 0.10 × walkability`
- **FR-003**: System MUST return two route options — "Fastest" (time-optimised) and "Safest" (safety-score-optimised via graphology) — for any valid origin/destination pair within Hyderabad
- **FR-004**: Users MUST be able to submit a hazard report by tapping the map, selecting a hazard type from an icon grid, and optionally uploading a photo or typing a description
- **FR-005**: System MUST update the affected segment's safety score within 2 seconds of a hazard report being confirmed
- **FR-006**: System MUST poll the Overpass API every 15 minutes for lighting and surface tag changes in the Hyderabad bounding box
- **FR-007**: System MUST store road segments with geospatial geometry in PostGIS and support bounding-box queries for map viewport loading
- **FR-008**: System MUST expose a conversational assistant (Claude API) that answers safety questions using live segment score data as context
- **FR-009**: System MUST generate a 2-line natural-language area summary for any tapped segment using Claude API
- **FR-010**: System MUST provide a route safety explanation comparing the two route options using Claude API
- **FR-011**: System MUST accept photo uploads via Cloudinary and process them through a CV pipeline (Claude Vision → CLIP/YOLOv8 fallback) to auto-suggest hazard type
- **FR-012**: System MUST accept free-text descriptions and process them through NLP zero-shot classification to auto-suggest hazard type
- **FR-013**: System MUST NOT include any crime data, policing information, or socioeconomic indicators in any data layer or AI prompt

### Key Entities

- **RoadSegment**: Represents a single OSM way or sub-divided way in Hyderabad. Key attributes: `segment_id`, `osm_way_id`, `geometry` (PostGIS LineString), `name`, `lighting_score`, `accident_rate_normalised`, `flood_risk`, `surface_quality`, `walkability_score`, `safety_score`, `safety_band`, `scoring_version`, `last_updated`, `data_sources[]`
- **HazardReport**: A citizen-submitted report. Key attributes: `report_id`, `segment_id` (FK), `hazard_type` (enum), `description` (optional), `photo_url` (optional, Cloudinary), `ai_suggested_type` (optional), `confirmed_type`, `severity_weight`, `reporter_token` (anonymous), `created_at`, `is_active`, `expires_at`
- **DataRefreshLog**: Audit trail for automated data pulls. Key attributes: `source` (osm/telangana/hydraa/morth), `fetched_at`, `segments_updated`, `status`, `error_message`
- **Route**: A computed route between two points. Not persisted — computed on-demand and returned in API response. Attributes: `origin`, `destination`, `waypoints[]`, `total_distance_m`, `estimated_time_s`, `route_safety_score`, `segment_ids[]`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The Hyderabad safety heatmap renders fully (with ≥1,000 coloured road segments) within 3 seconds on initial load on a standard 4G connection
- **SC-002**: Route comparison returns two valid route options in under 5 seconds for any origin/destination pair within the Hyderabad bounding box
- **SC-003**: A citizen hazard report submitted via the icon grid takes no more than 10 seconds end-to-end (tap → confirm → score update visible on map)
- **SC-004**: The Claude conversational assistant responds to a safety question with a relevant, data-grounded answer in under 4 seconds
- **SC-005**: The photo CV pipeline returns a hazard type suggestion within 8 seconds of upload
- **SC-006**: Overpass API polling job runs on schedule (every 15 min) with zero manual intervention, with failures logged and retried with exponential backoff
- **SC-007**: Safety score recomputes correctly (within ±0.01) when a new hazard report with known severity is submitted — verifiable via unit test on the scoring engine
- **SC-008**: The demo scenario (Priya: Kondapur → Gachibowli, 9pm, rainy) is executable end-to-end without errors using seed data

## Assumptions

- Hyderabad (GHMC limits + ORR) is the sole geographic scope for v1; no multi-city support
- OSM has sufficient coverage of road lighting and surface tags for Hyderabad to produce meaningful initial scores (any gaps default to 0.5 neutral)
- MoRTH accident data (most recent available year) will be downloaded and geocoded manually as a one-time seed before the hackathon demo
- HYDRAA flood zone shapefiles are available for download as GeoJSON or convertible from shapefile using `ogr2ogr`
- All users are anonymous for v1 — no user accounts, login, or persistent sessions (reports are tied to an anonymous device token)
- Mobile responsiveness is required (Priya demo uses a phone), but a native mobile app is out of scope
- English-only UI for v1; no Telugu or Hindi localisation
- The AI micro-service runs as a local FastAPI process in Docker during the hackathon; no cloud GPU required
- Internet connectivity is available for Claude API calls and Cloudinary uploads during the demo
