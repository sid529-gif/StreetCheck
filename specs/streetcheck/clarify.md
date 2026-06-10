# Clarify: StreetCheck v1

**Purpose**: Structured Q&A to de-risk ambiguous areas before implementation
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2026-06-10

---

## Q1: What OSM tile server should react-leaflet use?

**Question**: Should the base map tiles come from OSM's default tile server (`tile.openstreetmap.org`), a hosted service like Stadia Maps or Carto, or a custom tile server?

**Answer**: Use `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` for the hackathon. This avoids API key dependencies. For production, Stadia Maps (dark theme) is preferred for aesthetics.

**Decision**: OSM default tiles for hackathon. Attribution required.

---

## Q2: How is "nearest road segment" determined for citizen reports?

**Question**: When a user taps a location on the map that falls between two segments, how does the system determine which `segment_id` to attach the report to?

**Answer**: Use PostGIS `ST_DWithin` + `ST_Distance` to find the closest segment within 100 metres, ordered by ascending distance, limit 1. If no segment found within 100m, store as a free-floating point with `segment_id = null` and display separately.

**Decision**: 100m snap radius using PostGIS spatial query in `server/src/db/spatial.ts`.

---

## Q3: How are "active" reports managed over time?

**Question**: Hazard reports should expire. Should expiry be a hard delete, a soft delete with `is_active = false`, or a TTL in Redis?

**Answer**: Soft delete with `is_active = false` set by a cron job that runs every hour and sets `is_active = false` WHERE `expires_at < now()`. Default `expires_at` is `created_at + 24 hours`. High-severity reports (severity_weight ≥ 0.8) get `created_at + 72 hours`. No Redis needed for hackathon.

**Decision**: Soft delete via hourly cron. `active_report_count` on segment is a derived count, updated in the same transaction as is_active toggle.

---

## Q4: What is the graphology routing graph built from?

**Question**: The routing graph uses graphology with safety-weighted edges. What data populates the graph — all 50k OSM segments or just a subset?

**Answer**: For the hackathon, build the graph from all road segments in the PostGIS database (the seeded ~1,000 demo segments + whatever Overpass returns). Edges are weighted by `(1 - safety_score)` so lower safety = higher cost. The graph is loaded into memory at server start and updated when safety scores change. Nodes are segment endpoints (longitude/latitude pairs snapped to the nearest intersection).

**Decision**: In-memory graphology graph, rebuilt on server start and on score updates via an event emitter pattern. For 1,000 segments this is acceptable; for 50k segments, rebuild only the affected subgraph.

---

## Q5: How does route origin/destination resolve to graph nodes?

**Question**: The user enters "Kondapur" and "Gachibowli" as text. How does the app convert these to lat/lng and then to graph nodes?

**Answer**: Use the Nominatim geocoding API (`nominatim.openstreetmap.org`) for address → lat/lng resolution. Then use the same 100m PostGIS snap to find the nearest graph node to those coordinates. Nominatim is free and requires no API key; add a 1-second delay between requests per Nominatim usage policy.

**Decision**: Nominatim for geocoding (free, no key), then PostGIS snap for graph entry/exit node.

---

## Q6: What is the severity_weight of a citizen report and how does it affect the segment score?

**Question**: When a hazard report is submitted, how much does it adjust the affected segment's dimension score?

**Answer**: Each hazard type maps to a dimension and a severity multiplier:

- `pothole` → surface_quality −0.2
- `broken_streetlight` → lighting_score −0.25
- `waterlogging` → flood_risk +0.3 (adds risk)
- `construction_debris` → surface_quality −0.15, walkability_score −0.1
- `stray_animals` → walkability_score −0.1
- `broken_footpath` → walkability_score −0.25
- `open_manhole` → surface_quality −0.3

Multiple active reports on the same segment stack their penalties additively, capped so no dimension goes below 0 or above 1. The dimension adjustment is temporary (lives with the report's `is_active` period) — the base OSM/seed values are preserved separately.

**Decision**: Report penalties are computed on-the-fly as overrides on top of base values; base values never mutated by citizen reports. Only scheduled data pipeline updates the base values.

---

## Q7: Does the app need user authentication?

**Question**: The spec says "anonymous device token" — what does this mean technically?

**Answer**: On first load, the client generates a UUID and stores it in `localStorage`. This token is sent with every report submission as `reporter_token`. It is used only to prevent the same token from submitting more than 5 reports in 10 minutes (simple rate-limiting in Express middleware). No user account, no password, no JWT for regular users. The civic authority dashboard (User Story from brief Section 7, Flow 3) is out of scope for v1.

**Decision**: Anonymous UUID token in localStorage. Rate limiting via in-memory Map on Express (tokens → last submission timestamps). No auth system.

---

## Q8: How is the NLP classifier integrated into the report submission flow?

**Question**: Does NLP classification run synchronously during form submission (blocking the user) or asynchronously in the background?

**Answer**: Run asynchronously. The user sees the icon grid and can select a type immediately. If they type in the description field, after a 800ms debounce the frontend calls `POST /api/ai/classify-text` which proxies to the AI micro-service. The suggested type appears as a "Suggested" badge on the icon grid without blocking submission.

**Decision**: Client-side debounce (800ms), non-blocking async call. Suggestion is advisory only.

---

## Q9: How is the Claude API context constructed for the conversational assistant?

**Question**: How many segments are included in the Claude system prompt as context? How is relevance determined?

**Answer**: When a user asks a question, the frontend extracts any area keywords (e.g., "Banjara Hills", "Mehdipatnam") and sends them to `POST /api/ai/assistant`. The server geocodes the keywords, finds all segments within a 500m radius, fetches their scores, and injects them as a structured JSON block in the Claude system prompt (max 20 segments to stay within context limits). The system prompt also includes a hard constraint: "You are a road safety assistant for Hyderabad. Do not discuss crime or policing. Do not discuss areas outside Hyderabad."

**Decision**: Keyword-to-bbox → top 20 nearest segments → JSON context in Claude system prompt.

---

## Q10: Should the Overpass polling job ingest ALL OSM ways or only tagged ones?

**Question**: An unrestricted Hyderabad bounding box query could return tens of thousands of ways. How should the job be scoped?

**Answer**: Query only ways with `highway` tag set AND at least one of: `lit`, `surface`, `footway`, `sidewalk`, or `construction`. This filters to only navigable roads with safety-relevant metadata. Estimate: ~8,000–15,000 ways for Hyderabad. For the hackathon demo, additionally filter to a tighter bounding box around Kondapur–Gachibowli–Banjara Hills (17.38–17.48°N, 78.36–78.42°E) to keep response times fast.

**Decision**: Two-stage: tight hackathon bbox (Kondapur/Gachibowli area) for demo; full Hyderabad bbox available via config flag `OVERPASS_FULL_CITY=true`.
