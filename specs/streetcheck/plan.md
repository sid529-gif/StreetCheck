# Implementation Plan: StreetCheck v1

**Branch**: `feat/streetcheck-v1` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/streetcheck/spec.md`

---

## Summary

StreetCheck is a civic road safety intelligence platform for Hyderabad that assigns per-road-segment safety scores derived from OpenStreetMap lighting/surface data, MoRTH accident records, HYDRAA flood zones, and real-time citizen hazard reports. Users view a colour-coded heatmap, compare fastest vs. safest routes via a graphology-powered weighted graph, submit hazard reports (with photo CV and NLP tagging via Claude + HuggingFace), and query a conversational Claude API safety assistant. The tech stack is a Node.js/Express + React 18 monorepo backed by PostgreSQL/PostGIS, with a standalone Python/FastAPI AI micro-service.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict) for `client/`, `server/`, `shared/`; Python 3.11 for `ai-service/`

**Primary Dependencies**:
- Frontend: React 18, Vite, react-leaflet, Leaflet, Zustand, React Query, React Router v6, Tailwind CSS
- Backend: Express.js, Prisma ORM, `node-cron`, `graphology`, `graphology-shortest-path`, `jsonwebtoken`, `@anthropic-ai/sdk`, `cloudinary`
- AI Service: FastAPI, `anthropic`, `transformers` (HuggingFace), `torch`, `ultralytics` (YOLOv8), Pillow
- Shared: Zod, TypeScript

**Storage**: PostgreSQL 15 + PostGIS 3.x (Docker in dev; Render managed Postgres in prod)

**Testing**: Vitest (unit + integration) for TS workspaces; pytest for Python AI service

**Target Platform**: Web (desktop + mobile-responsive); deployed as Render web service (backend) + GitHub Pages (frontend)

**Performance Goals**: Heatmap renders ≤3s on 4G; route computation ≤5s; report submission end-to-end ≤10s; Claude responses ≤4s

**Constraints**: No Google Maps SDK; no Python for routing; no crime data in any data layer or AI prompt; all spatial queries via PostGIS; scoring weights locked in `shared/`

**Scale/Scope**: ~50,000 OSM road segments in Hyderabad bounding box; hackathon demo targets ~1,000 seeded segments with full score data

---

## Constitution Check

- ✅ Civic data only — no crime data in any layer
- ✅ Monorepo: `client/`, `server/`, `shared/`, `ai-service/` separation maintained
- ✅ All schemas defined in `shared/src/schemas/` as Zod types
- ✅ PostGIS for all spatial queries; graphology for routing
- ✅ Claude `claude-sonnet-4-20250514` as primary AI model; HuggingFace/CLIP as fallback
- ✅ Scoring weights defined in `shared/src/scoring/weights.ts` — locked
- ✅ No `any` types; TypeScript strict mode throughout

---

## Project Structure

### Documentation (this feature)

```text
specs/streetcheck/
├── plan.md              # This file
├── spec.md              # Feature specification
├── clarify.md           # Q&A document
├── data-model.md        # Database schema + entity detail
├── contracts/
│   ├── api-segments.md  # /api/segments endpoints
│   ├── api-reports.md   # /api/reports endpoints
│   ├── api-routes.md    # /api/routes endpoints
│   ├── api-ai.md        # /api/ai endpoints (assistant, summary, explanation)
│   └── ai-service.md    # FastAPI AI micro-service endpoints
└── tasks.md             # Phase-by-phase task list
```

### Source Code (repository root)

```text
streetcheck-hackathon-project/
├── package.json                    # npm workspaces root
├── pyproject.toml                  # Python tooling config (ai-service)
├── docker-compose.yml              # PostgreSQL + PostGIS + ai-service
├── .env.example                    # All required env vars documented
│
├── client/                         # React 18 + Vite frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── map/
│       │   │   ├── SafetyMap.tsx          # Leaflet map + heatmap overlay
│       │   │   ├── SegmentLayer.tsx       # GeoJSON segment colouring
│       │   │   ├── SegmentDetailCard.tsx  # Tap-to-view segment scores
│       │   │   └── ReportPin.tsx          # Active citizen report markers
│       │   ├── routing/
│       │   │   ├── RouteSearchBar.tsx     # Origin/destination input
│       │   │   ├── RouteComparisonPanel.tsx  # Fastest vs Safest cards
│       │   │   └── RouteExplanation.tsx   # AI explanation text
│       │   ├── reporting/
│       │   │   ├── ReportModal.tsx        # Hazard type icon grid + form
│       │   │   ├── HazardIconGrid.tsx     # 7-type icon picker
│       │   │   └── PhotoUploader.tsx      # Cloudinary upload + CV result
│       │   └── assistant/
│       │       ├── ChatBubble.tsx         # Floating chat button
│       │       └── AssistantPanel.tsx     # Conversational safety chat UI
│       ├── store/
│       │   ├── mapStore.ts               # Zustand: viewport, filters, selected segment
│       │   └── sessionStore.ts           # Zustand: anonymous device token
│       ├── hooks/
│       │   ├── useSegments.ts            # React Query: fetch segments by bbox
│       │   ├── useRoute.ts               # React Query: compute route
│       │   └── useReports.ts             # React Query: submit/fetch reports
│       └── services/
│           └── api.ts                    # Typed API client using shared Zod schemas
│
├── server/                         # Node.js + Express backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # Express app entry point
│       ├── routes/
│       │   ├── segments.ts               # GET /api/segments, GET /api/segments/:id
│       │   ├── reports.ts                # POST /api/reports, GET /api/reports
│       │   ├── routes.ts                 # POST /api/routes
│       │   └── ai.ts                     # POST /api/ai/assistant, /summary, /explanation
│       ├── services/
│       │   ├── scoringEngine.ts          # Safety score computation (imports weights from shared)
│       │   ├── routingService.ts         # graphology graph + shortest-path computation
│       │   ├── overpassPoller.ts         # node-cron + Overpass API polling
│       │   ├── aiClient.ts               # Anthropic SDK wrapper + prompt templates
│       │   └── cloudinaryService.ts      # Upload helper
│       ├── jobs/
│       │   ├── overpassJob.ts            # Cron: every 15 min
│       │   └── dataRefreshJob.ts         # Cron: every 6 hrs (Telangana portal)
│       ├── db/
│       │   ├── prisma.ts                 # Prisma client singleton
│       │   └── spatial.ts               # Raw PostGIS query helpers
│       └── middleware/
│           ├── validate.ts               # Zod request validation middleware
│           └── errorHandler.ts
│
├── shared/                         # Shared Zod schemas + TypeScript types
│   ├── package.json
│   └── src/
│       ├── schemas/
│       │   ├── segment.ts                # RoadSegment Zod schema
│       │   ├── report.ts                 # HazardReport Zod schema
│       │   ├── route.ts                  # Route request/response Zod schema
│       │   └── ai.ts                     # AI request/response Zod schema
│       ├── scoring/
│       │   └── weights.ts                # Locked scoring weights + compute function
│       └── types/
│           └── index.ts                  # Re-exports of inferred Zod types
│
├── ai-service/                     # Python FastAPI AI micro-service
│   ├── pyproject.toml
│   ├── main.py                           # FastAPI app
│   └── src/
│       ├── routes/
│       │   ├── classify.py               # POST /classify — NLP zero-shot
│       │   └── detect.py                 # POST /detect — CV hazard detection
│       ├── models/
│       │   ├── nlp_classifier.py         # HuggingFace zero-shot classifier
│       │   └── cv_detector.py            # CLIP + YOLOv8 fallback pipeline
│       └── schemas.py                    # Pydantic request/response models
│
└── prisma/
    ├── schema.prisma                     # Prisma schema with PostGIS raw types
    └── migrations/                       # Auto-generated migration files
```

---

## Data Model

### `road_segments` (PostGIS table)

```sql
CREATE TABLE road_segments (
  segment_id          TEXT PRIMARY KEY,
  osm_way_id          BIGINT,
  name                TEXT,
  geometry            GEOMETRY(LINESTRING, 4326) NOT NULL,
  lighting_score      FLOAT NOT NULL DEFAULT 0.5,
  accident_rate       FLOAT NOT NULL DEFAULT 0.0,  -- normalised [0,1]
  flood_risk          FLOAT NOT NULL DEFAULT 0.0,  -- normalised [0,1]
  surface_quality     FLOAT NOT NULL DEFAULT 0.5,
  walkability_score   FLOAT NOT NULL DEFAULT 0.5,
  safety_score        FLOAT GENERATED ALWAYS AS (
                        0.30 * lighting_score
                        + 0.25 * (1 - accident_rate)
                        + 0.20 * (1 - flood_risk)
                        + 0.15 * surface_quality
                        + 0.10 * walkability_score
                      ) STORED,
  safety_band         TEXT GENERATED ALWAYS AS (
                        CASE
                          WHEN safety_score >= 0.75 THEN 'green'
                          WHEN safety_score >= 0.45 THEN 'amber'
                          ELSE 'red'
                        END
                      ) STORED,
  scoring_version     INTEGER NOT NULL DEFAULT 1,
  active_report_count INTEGER NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_sources        TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX road_segments_geometry_idx ON road_segments USING GIST(geometry);
```

### `hazard_reports` (standard table)

```sql
CREATE TABLE hazard_reports (
  report_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id        TEXT NOT NULL REFERENCES road_segments(segment_id),
  hazard_type       TEXT NOT NULL CHECK (hazard_type IN (
                      'pothole','broken_streetlight','waterlogging',
                      'construction_debris','stray_animals','broken_footpath','open_manhole'
                    )),
  description       TEXT,
  photo_url         TEXT,
  ai_suggested_type TEXT,
  confirmed_type    TEXT NOT NULL,
  severity_weight   FLOAT NOT NULL DEFAULT 0.5,
  reporter_token    TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX hazard_reports_segment_idx ON hazard_reports(segment_id, is_active);
CREATE INDEX hazard_reports_expires_idx ON hazard_reports(expires_at);
```

### `data_refresh_log` (audit table)

```sql
CREATE TABLE data_refresh_log (
  id               SERIAL PRIMARY KEY,
  source           TEXT NOT NULL CHECK (source IN ('osm','telangana','hydraa','morth','user_report')),
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  segments_updated INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL CHECK (status IN ('success','partial','failed')),
  error_message    TEXT
);
```

---

## API Contracts

### Segments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/segments` | Fetch segments by bounding box (`?bbox=minLng,minLat,maxLng,maxLat`). Returns GeoJSON FeatureCollection. |
| `GET` | `/api/segments/:id` | Fetch single segment with full score breakdown and active reports |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/reports` | Submit a hazard report. Body: `{ segmentId, hazardType, description?, photoUrl?, confirmedType, reporterToken }` |
| `GET` | `/api/reports` | Fetch active reports by bbox (`?bbox=...`). Returns report pins for map overlay |

### Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/routes` | Compute route options. Body: `{ origin: { lat, lng }, destination: { lat, lng } }`. Returns `{ fastest: Route, safest: Route }` |

### AI

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/assistant` | Conversational query. Body: `{ message: string, contextSegmentIds?: string[] }` |
| `POST` | `/api/ai/summary` | Area summary. Body: `{ segmentId: string }` → returns 2-line summary |
| `POST` | `/api/ai/explanation` | Route explanation. Body: `{ fastestRoute: Route, safestRoute: Route }` → returns explanation text |

### AI Micro-Service (internal)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/classify` | NLP zero-shot. Body: `{ text: string }` → `{ hazardType, confidence }` |
| `POST` | `/detect` | CV hazard detection. Body: `{ imageUrl: string }` → `{ hazardType, confidence, fallbackUsed }` |

---

## Complexity Tracking

No constitution violations for v1 — within permitted complexity bounds.

---

## Verification Plan

### Automated Tests

```bash
# Run all TypeScript tests (unit + integration)
npm run test --workspaces

# Run scoring engine unit tests specifically
npm run test -w server -- --reporter=verbose src/services/scoringEngine.test.ts

# Run Zod schema validation tests
npm run test -w shared

# Run Python AI service tests
cd ai-service && pytest -v
```

### Manual Verification

1. **Heatmap load**: Open the app, verify ≥1,000 coloured segments load within 3s
2. **Segment tap**: Tap any red segment, verify sub-scores and report count appear
3. **Route demo**: Enter "Kondapur" → "Gachibowli", verify two route cards with different safety scores
4. **Report flow**: Tap map, select "pothole", submit, verify heatmap colour updates
5. **Photo upload**: Upload a pothole photo, verify CV suggests "pothole" as hazard type
6. **AI assistant**: Ask "Is it safe to walk near Mehdipatnam at night?" — verify response mentions specific segment data
7. **Overpass poll**: Trigger cron manually, verify `data_refresh_log` entry is created with `status: 'success'`
