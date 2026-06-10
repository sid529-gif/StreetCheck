---
description: 'Task list for StreetCheck v1 implementation — 2-day hackathon sprint'
---

# Tasks: StreetCheck v1

**Input**: Design documents from `specs/streetcheck/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | clarify.md ✅
**Sprint**: 2-day hackathon (Day 1: Foundation + Map; Day 2: AI + Polish)
**Organization**: Tasks grouped by user story to enable independent implementation and checkpointing

---

## Phase 1: Setup — Monorepo Scaffolding

**Purpose**: Get the monorepo structure, Docker environment, and shared schemas running before any feature work begins.

- [ ] T001 Initialise npm workspaces root `package.json` with `client/`, `server/`, `shared/` workspaces
- [ ] T002 [P] Scaffold `client/` with Vite + React 18 + TypeScript (`npm create vite@latest client -- --template react-ts`)
- [ ] T003 [P] Scaffold `server/` with Node.js + Express + TypeScript + Prisma (`npm init` + `npm install express prisma @prisma/client`)
- [ ] T004 [P] Scaffold `shared/` with TypeScript + Zod (`npm init` + `npm install zod`)
- [ ] T005 [P] Scaffold `ai-service/` with FastAPI + uvicorn + anthropic + transformers (`uv init` + `uv add fastapi uvicorn anthropic transformers torch ultralytics pillow`)
- [ ] T006 Create `docker-compose.yml` with services: `postgres` (PostGIS 3.x image), `ai-service` (Python FastAPI)
- [ ] T007 Add `.env.example` documenting: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CLOUDINARY_URL`, `AI_SERVICE_URL`, `OVERPASS_FULL_CITY`
- [ ] T008 [P] Configure Prisma schema (`prisma/schema.prisma`) with `road_segments`, `hazard_reports`, `data_refresh_log` tables
- [ ] T009 [P] Configure dev tooling: Prettier, ESLint, Biome, Husky, lint-staged, Vitest, Knip across all TS workspaces
- [ ] T010 [P] Configure Python tooling: Ruff, Black, mypy in `ai-service/pyproject.toml`

**Checkpoint**: `docker-compose up` runs without errors; Prisma `db push` creates all three tables; `npm run lint` passes across all workspaces

---

## Phase 2: Foundational — Shared Schemas + DB + Overpass Seed

**Purpose**: Core infrastructure that blocks all user stories. Must be complete before any feature work.

⚠️ **CRITICAL**: No user story can begin until this phase is complete

- [ ] T011 Define Zod schemas in `shared/src/schemas/`: `segment.ts`, `report.ts`, `route.ts`, `ai.ts`
- [ ] T012 [P] Define locked scoring weights in `shared/src/scoring/weights.ts` with exported `computeSafetyScore()` function
- [ ] T013 Re-export all inferred TypeScript types from `shared/src/types/index.ts`
- [ ] T014 Implement Overpass API query in `server/src/services/overpassPoller.ts` — Hyderabad hackathon bbox, filters for `highway` + safety tags
- [ ] T015 Implement PostGIS segment upsert logic in `server/src/db/spatial.ts` — convert Overpass way → `road_segments` row with geometry
- [ ] T016 Run initial Overpass seed: execute poller manually to populate `road_segments` with ~1,000 seeded segments for the Kondapur–Gachibowli demo area
- [ ] T017 [P] Import and geocode MoRTH accident black spot CSV → update `accident_rate` on matching segments
- [ ] T018 [P] Import HYDRAA flood zone GeoJSON → update `flood_risk` on segments within flood zone using PostGIS `ST_Intersects`
- [ ] T019 Implement `server/src/services/scoringEngine.ts` — recomputes a segment's `safety_score` and `safety_band` from sub-scores using `shared/src/scoring/weights.ts`
- [ ] T020 Set up Express app skeleton in `server/src/index.ts` — CORS, JSON middleware, route registration, error handler, `validate.ts` Zod middleware
- [ ] T021 Set up `node-cron` jobs in `server/src/jobs/`: `overpassJob.ts` (every 15 min), `dataRefreshJob.ts` (every 6 hrs), report expiry job (every 1 hr)

**Checkpoint**: Database has ≥500 seeded road segments with non-null `safety_score`; scoring engine unit test passes for known inputs; cron jobs log correctly on startup

---

## Phase 3: User Story 2 — Safety Heatmap View (P2) 🗺️

> _Note: US2 (heatmap) is implemented before US1 (routing) because the map is the prerequisite visual layer for everything else._

**Goal**: Map loads with colour-coded road segments; tapping a segment shows its score breakdown.

**Independent Test**: Open the app → see heatmap → tap a segment → read score card. No routing or reporting needed.

### Implementation

- [ ] T022 Implement `GET /api/segments` endpoint in `server/src/routes/segments.ts` — PostGIS bbox query returning GeoJSON FeatureCollection with safety properties
- [ ] T023 [P] Implement `GET /api/segments/:id` endpoint — single segment + active reports count
- [ ] T024 Set up `client/` base: `App.tsx`, React Router, Zustand stores (`mapStore.ts`, `sessionStore.ts`), typed API client (`services/api.ts`)
- [ ] T025 Implement `useSegments` React Query hook — fetches segments by current map viewport bbox, refetches on map move (debounced 500ms)
- [ ] T026 [P] Implement `SafetyMap.tsx` — Leaflet map centred on Hyderabad, OpenStreetMap base tiles, zoom controls
- [ ] T027 Implement `SegmentLayer.tsx` — Leaflet GeoJSON layer consuming `useSegments` data; colours each feature by `safety_band` (green #22c55e / amber #f59e0b / red #ef4444)
- [ ] T028 Implement `SegmentDetailCard.tsx` — slide-up panel on segment tap showing: name, overall score (gauge), 5 dimension scores (progress bars), active_report_count, last_updated, safety_band badge with message
- [ ] T029 Add loading skeleton for initial map load and "Data last updated: X min ago" toast for stale data scenarios

**Checkpoint**: Open app → heatmap loads within 3s → tap any segment → detail card shows correct sub-scores → matches database values

---

## Phase 4: User Story 1 — Route Safety Comparison (P1) 🎯 MVP

**Goal**: User enters origin + destination → receives Fastest vs. Safest route cards with safety scores and AI explanation.

**Independent Test**: Enter "Kondapur" → "Gachibowli" → receive two route cards with differing safety scores → read AI explanation.

### Implementation

- [ ] T030 Build graphology routing graph in `server/src/services/routingService.ts` — load all segment nodes and edges from PostGIS at startup; edge weight = `(1 - safety_score)`; rebuild on score updates via EventEmitter
- [ ] T031 Implement Nominatim geocoding helper in `server/src/services/routingService.ts` — address string → `{ lat, lng }` with 1s rate-limit delay
- [ ] T032 Implement `POST /api/routes` endpoint in `server/src/routes/routes.ts` — geocode origin/destination → snap to graph nodes → run `graphology-shortest-path` twice (min-time weight: distance; min-risk weight: `1 - safety_score`) → return `{ fastest, safest }` with segment arrays
- [ ] T033 Implement `useRoute` React Query hook in `client/` — mutation hook for route POST
- [ ] T034 Implement `RouteSearchBar.tsx` — origin/destination text inputs with Nominatim autocomplete suggestions (debounced 400ms)
- [ ] T035 Implement `RouteComparisonPanel.tsx` — two cards side by side: "Fastest" (⚡) and "Safest" (🛡️), each showing: safety score badge, travel time, colour band, "View details" button; animate in with slide-up transition
- [ ] T036 Implement route overlay on map: draw fastest route (grey) and safest route (colour-by-safety) as Leaflet Polylines; highlight selected route
- [ ] T037 Implement `POST /api/ai/explanation` in `server/src/routes/ai.ts` — pass both route's segment data to Claude, return 2-3 sentence comparison
- [ ] T038 Implement `RouteExplanation.tsx` — displays AI explanation text below route cards with typewriter animation

**Checkpoint**: Kondapur → Gachibowli returns two routes with different scores; fastest route passes through a lower-scored segment; AI explanation correctly references that segment; both polylines visible on map

---

## Phase 5: User Story 3 — Citizen Hazard Reporting (P3) 📍

**Goal**: User taps map → selects hazard type → optionally uploads photo → submits → score updates immediately.

**Independent Test**: Tap map → select "pothole" → submit → segment score decreases → report pin appears.

### Implementation

- [ ] T039 Implement `POST /api/reports` endpoint in `server/src/routes/reports.ts` — validate with Zod, insert report, apply hazard penalty to segment scores (via scoringEngine), update `active_report_count`, return updated segment
- [ ] T040 [P] Implement `GET /api/reports` endpoint — active reports by bbox, returns GeoJSON points for map pins
- [ ] T041 Set up Cloudinary upload helper in `server/src/services/cloudinaryService.ts` — `uploadFromBuffer()` returning secure URL
- [ ] T042 Implement `POST /api/ai/classify-text` route — proxy to AI service `/classify` endpoint; return `{ hazardType, confidence }`
- [ ] T043 Implement NLP classifier in `ai-service/src/routes/classify.py` — HuggingFace `facebook/bart-large-mnli` zero-shot across 7 hazard labels
- [ ] T044 Implement CV hazard detector in `ai-service/src/routes/detect.py` — Claude Vision (primary) → CLIP zero-shot (fallback if confidence < 0.65) → return `{ hazardType, confidence, fallbackUsed }`
- [ ] T045 [P] Implement `HazardIconGrid.tsx` — 7 icon tiles (emoji + label), selected state with border highlight, "Suggested" badge overlay when AI returns a suggestion
- [ ] T046 [P] Implement `PhotoUploader.tsx` — drag-and-drop + tap to upload; shows upload progress bar; on success, calls `/api/ai/detect-photo` and updates icon grid with AI suggestion
- [ ] T047 Implement `ReportModal.tsx` — full flow: map tap → modal open → icon grid selection → optional description (triggers NLP on 800ms debounce) → optional photo → submit button → loading state → success toast; closes and updates map
- [ ] T048 Implement `ReportPin.tsx` — Leaflet custom markers for active reports with hazard type icon; clusters when zoomed out
- [ ] T049 Implement `useReports` hook — fetches report pins by viewport bbox; mutation hook for report submission; invalidates segment query on success

**Checkpoint**: Submit a "waterlogging" report → segment `flood_risk` increases → `safety_score` decreases → colour on map changes → report pin appears for other users

---

## Phase 6: User Story 4 — Conversational Safety Assistant (P4) 🤖

**Goal**: Floating chat bubble allows natural language safety queries grounded in segment data.

**Independent Test**: Ask "Is it safe to walk near Mehdipatnam at night?" → response references specific segment scores.

### Implementation

- [ ] T050 Implement `POST /api/ai/assistant` in `server/src/routes/ai.ts` — extract area keywords from message, geocode, fetch top 20 nearest segments, build Claude system prompt with segment JSON context + hard constraint (no crime/policing/outside Hyderabad), call Anthropic SDK, stream response
- [ ] T051 [P] Implement `POST /api/ai/summary` — fetch segment by ID, build Claude prompt with all 5 sub-scores + active reports, return 2-line natural language summary
- [ ] T052 Implement `ChatBubble.tsx` — fixed bottom-right floating button with pulse animation; opens `AssistantPanel.tsx` on click
- [ ] T053 Implement `AssistantPanel.tsx` — chat UI with: message history, typing indicator, suggested prompts on open, error state for API unavailability, smooth scroll to latest message
- [ ] T054 Wire AI area summary into `SegmentDetailCard.tsx` — when detail card opens, fetch and display 2-line Claude summary below score breakdown

**Checkpoint**: Ask about Mehdipatnam flooding → assistant response references at least one real segment's flood_risk score → error state shown when API key is unset

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UI refinement, mobile responsiveness, demo data curation, edge case handling.

- [ ] T055 [P] Implement Tailwind CSS design system — dark map theme, safety colour tokens (green/amber/red), typography scale (Inter font), card shadows, animation utilities
- [ ] T056 [P] Mobile responsiveness — route panel collapses to bottom sheet on mobile; report modal is full-screen; map controls sized for touch
- [ ] T057 Curate demo seed data — ensure Kondapur–Gachibowli corridor has a compelling mix: at least 2 red segments (unlit/flood-risk) on the "fastest" route and a clearly safer alternate; confirm with Priya demo script
- [ ] T058 Add report expiry cron job in `server/src/jobs/` — sets `is_active = false`, decrements `active_report_count`, logs to `data_refresh_log`
- [ ] T059 [P] Implement rate limiting for report submissions — in-memory Map tracking `reporter_token` → recent submissions; reject if > 5 reports in 10 minutes
- [ ] T060 [P] Add `AGENTS.md` update with StreetCheck-specific context — tech stack, API keys needed, seed data scripts
- [ ] T061 [P] Write scoring engine unit tests in `server/src/services/scoringEngine.test.ts` — test all 5 dimension weights, combined formula, band classification
- [ ] T062 [P] Write Zod schema validation tests in `shared/` — test all 4 schemas with valid and invalid inputs
- [ ] T063 End-to-end demo rehearsal — run Priya scenario start to finish, verify no console errors, no blank states, no missing data
- [ ] T064 [P] Set up `.gitignore` additions: `ai-service/__pycache__/`, `ai-service/.venv/`, `.env`, all `.speckit/commands/` (as per constitution security note)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion. **BLOCKS all user stories**
- **Phases 3–6 (User Stories)**: All depend on Phase 2 completion
  - US2 (heatmap, Phase 3) can start as soon as segments API works
  - US1 (routing, Phase 4) depends on Phase 3 map being renderable (shares map layer)
  - US3 (reporting, Phase 5) is independent of US1 after Phase 2
  - US4 (assistant, Phase 6) is independent of US1–US3 after Phase 2
- **Phase 7 (Polish)**: Depends on at least US1 + US2 + US3 being feature-complete

### Day 1 Execution Plan

| Time        | Phases                                                         |
| ----------- | -------------------------------------------------------------- |
| 9:00–11:00  | Phase 1 (Setup) + Phase 2 start (Overpass seed)                |
| 11:00–13:00 | Phase 2 completion (MoRTH + HYDRAA ingestion + scoring engine) |
| 13:00–15:00 | Phase 3 — Heatmap API + basic map render                       |
| 15:00–18:00 | Phase 3 completion — Segment detail card                       |
| 18:00–21:00 | Phase 4 — Routing graph + route comparison panel               |

### Day 2 Execution Plan

| Time        | Phases                                                |
| ----------- | ----------------------------------------------------- |
| 9:00–11:00  | Phase 5 start — Report modal + icon grid              |
| 11:00–13:00 | Phase 5 completion — Photo upload + CV pipeline + NLP |
| 13:00–15:00 | Phase 6 — Claude assistant + segment summaries        |
| 15:00–17:00 | Phase 7 — Polish, mobile, demo data                   |
| 17:00–18:00 | Demo rehearsal + edge cases                           |

### Parallel Opportunities

- T002, T003, T004, T005 — scaffold all packages simultaneously (different directories)
- T017, T018 — MoRTH and HYDRAA imports are independent data sources
- T022, T023 — two different Express endpoints, no shared state
- T026, T027 — map base and segment layer are different components
- T040, T041 — reports GET endpoint and Cloudinary setup are independent
- T045, T046 — HazardIconGrid and PhotoUploader are independent components
- T050, T051 — assistant and summary endpoints are independent AI calls

---

## Notes

- [P] tasks = can be executed in parallel (different files, no shared state)
- Scoring formula weights MUST NOT be changed without updating `shared/src/scoring/weights.ts` and bumping `scoring_version`
- All Claude API calls must include the hard constraint: no crime data, no policing, Hyderabad only
- Demo data must be manually verified against Priya scenario before Phase 7 ends
- Commit after each checkpoint, not after each task
- Python AI service must be running (via Docker) before testing T043, T044
