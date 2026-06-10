# StreetCheck

> *"Google Maps tells you the fastest route. StreetCheck tells you the safest one."*

StreetCheck is a civic road safety intelligence platform for Hyderabad. It assigns per-road-segment safety scores derived from publicly verifiable data — street lighting conditions, accident history, flooding risk, road surface quality, and footpath continuity. Citizens can contribute real-time hazard reports, and AI surfaces natural-language safety summaries and route recommendations optimised for safety rather than speed.

## About the Project

### Problem Statement

Current navigation systems (Google Maps, Apple Maps, Ola Maps) optimise exclusively for **time and distance**. They have no model of road-level safety.

This leaves several user groups without reliable safety information when navigating:

- Women commuting or walking at night
- Students on public transport routes on foot
- Senior citizens navigating uneven or poorly maintained roads
- Cyclists sharing roads with heavy traffic
- Delivery personnel in unfamiliar areas during rain or darkness

Specific hazards not captured by any existing navigation tool:

| Hazard | Example |
|---|---|
| Poor lighting | Unlit stretches between two lit roads |
| Accident-prone intersections | Known black spots with no signage |
| Waterlogging / flooding | Low-lying underpasses during monsoon |
| Broken or missing footpaths | Pedestrians forced onto roads |
| Active construction zones | Open trenches, debris, temporary diversions |
| Damaged road surface | Potholes, broken tarmac, open manholes |

### Proposed Solution

Each road segment in the city gets a **StreetCheck Safety Score** (0–100) computed as a weighted composite of multiple civic data inputs. Users view a colour-coded heatmap, compare fastest vs. safest route options, and submit real-time hazard reports. An AI assistant (Claude API) answers natural language safety questions and explains route recommendations.

### Inspiration

[CrystalRoof (UK)](https://www.crystalroof.co.uk/) applies the same mental model to UK properties — aggregating schools, flood risk, transport scores, and environmental data into a per-area intelligence layer. StreetCheck applies that same logic to Indian roads, focused entirely on civic and road safety. No crime data. No controversy.

### Key Features

- Safety heatmap — roads colour-coded green / amber / red by composite safety score
- Fastest vs. safest route comparison with AI-generated explanation of why the safer route scores higher
- Citizen hazard reporting — icon grid selection, optional photo upload with CV auto-tagging, optional free-text with NLP classification
- Segment detail view — per-dimension score breakdown (lighting, accident rate, flood risk, surface, walkability) with AI-generated 2-line summary
- Conversational safety assistant — natural language Q&A grounded in live segment score data
- Automated data ingestion — Overpass API polling (OSM), HYDRAA flood zone shapefiles, MoRTH accident black spots, Telangana Open Data

### What StreetCheck is NOT

- It does **not** include crime data or policing information of any kind
- It does **not** map socioeconomic indicators
- It is a **civic infrastructure and road safety tool only**

### Target Users

| User Group | Primary Use Case |
|---|---|
| Women commuters | Late-night walking routes, well-lit paths |
| Students | Safe routes near colleges and bus stops |
| Senior citizens | Footpath quality, accessible routes |
| Cyclists | Road surface quality |
| Runners | Early morning / late-night route safety |
| Delivery personnel | Monsoon-safe routing, pothole avoidance |
| City authorities | Maintenance prioritisation dashboard |

### Project Status

Hackathon prototype — full-stack architecture, speckit-driven design documents, deployment pipeline, and core application workflows specified and in active development.

---

## Tech Stack

### Frontend (`client/`)

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Dev server and bundler |
| Tailwind CSS v3 | Styling |
| React Router v6 | Client-side routing |
| Zustand | Global state (map filters, session token) |
| React Query | Server state, API data fetching and caching |
| `react-leaflet` | Map rendering (Leaflet wrapper for React) |
| Leaflet GeoJSON | Safety heatmap overlay, segment colouring |

### Backend (`server/`)

| Tool | Purpose |
|---|---|
| Node.js ≥ 20 | Runtime |
| Express.js | REST API framework |
| Prisma ORM | Database access layer |
| PostgreSQL + PostGIS | Road segment storage with geospatial queries |
| `node-cron` | Scheduled Overpass API polling jobs |
| `graphology` + `graphology-shortest-path` | Safety-weighted routing graph |
| `jsonwebtoken` | Auth tokens |
| Winston | Structured logging |

### AI & ML Pipeline (`ai-service/` — Python standalone)

| Tool | Purpose |
|---|---|
| Claude Vision API (`claude-sonnet-4-20250514`) | Photo hazard detection, conversational assistant, area summaries, route explanations |
| HuggingFace `facebook/bart-large-mnli` | Zero-shot NLP classification of free-text reports |
| CLIP / YOLOv8 | Fallback CV heuristics for hazard type suggestion |
| Python 3.11 + FastAPI | Thin internal micro-service exposing `/classify` and `/detect` |

### Shared (`shared/`)

| Tool | Purpose |
|---|---|
| Zod | Single source of truth for all API schemas; imported by both `client/` and `server/` |
| TypeScript 5.x (strict) | Type safety across all workspaces |

### Data Sources

| Source | Data | Update Frequency |
|---|---|---|
| OpenStreetMap (Overpass API) | Road geometry, lighting tags, surface type, footway presence | Every 15 minutes |
| Telangana Open Data Portal | Accident records, civic complaints | Every 6 hours |
| HYDRAA (flood zones) | Flood-prone shapefile overlays | Weekly freshness check |
| MoRTH accident records | National black spot data | Annual seed |
| StreetCheck citizen reports | All live ephemeral hazards | Always live |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local dev (PostgreSQL + PostGIS + ai-service) |
| GitLab CI/CD | Lint, type-check, test, security pipeline |
| GitHub Actions | GitHub Pages deployment |
| Render | Backend Docker web service deployment |
| Cloudinary | User photo uploads (CV pipeline input) |

### Dev Tooling

| Tool | Purpose |
|---|---|
| Vitest | Unit and integration tests (client and server) |
| Prettier | Code formatting |
| ESLint + oxlint + Biome | Multi-layer linting |
| Husky + lint-staged | Pre-commit hooks |
| Knip | Dead code detection |
| `git-cliff` | Changelog generation |
| Gitleaks | Secret scanning |
| Ruff + Black + mypy | Python AI service linting and formatting |

---

## Repository Structure

```text
streetcheck-hackathon-project/
├── package.json                  # npm workspaces root
├── pyproject.toml                # Python tooling config (ai-service)
├── docker-compose.yml            # PostgreSQL + PostGIS + ai-service
├── .env.example                  # All required env vars documented
├── AGENTS.md                     # Agent context: stack, commands, plan pointer
│
├── client/                       # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/              # SafetyMap, SegmentLayer, SegmentDetailCard, ReportPin
│   │   │   ├── routing/          # RouteSearchBar, RouteComparisonPanel, RouteExplanation
│   │   │   ├── reporting/        # ReportModal, HazardIconGrid, PhotoUploader
│   │   │   └── assistant/        # ChatBubble, AssistantPanel
│   │   ├── hooks/                # useSegments, useRoute, useReports
│   │   ├── store/                # Zustand: mapStore, sessionStore
│   │   ├── services/             # Typed API client
│   │   └── pages/                # Route-level screens
│   ├── index.html
│   └── package.json
│
├── server/                       # Node.js + Express backend
│   ├── src/
│   │   ├── routes/               # segments, reports, routes, ai
│   │   ├── services/             # scoringEngine, routingService, overpassPoller, aiClient, cloudinaryService
│   │   ├── jobs/                 # overpassJob (15 min), dataRefreshJob (6 hr), reportExpiryJob (1 hr)
│   │   ├── db/                   # Prisma client singleton, PostGIS query helpers
│   │   └── middleware/           # Zod validation, error handler, rate limiter
│   └── package.json
│
├── shared/                       # Shared Zod schemas + TypeScript types
│   ├── src/
│   │   ├── schemas/              # segment.ts, report.ts, route.ts, ai.ts
│   │   ├── scoring/              # weights.ts — locked scoring formula + computeSafetyScore()
│   │   └── types/                # Re-exported inferred Zod types
│   └── package.json
│
├── ai-service/                   # Python FastAPI AI micro-service
│   ├── main.py
│   ├── src/
│   │   ├── routes/               # classify.py (NLP), detect.py (CV)
│   │   ├── models/               # nlp_classifier.py, cv_detector.py
│   │   └── schemas.py
│   └── pyproject.toml
│
├── prisma/
│   ├── schema.prisma             # road_segments, hazard_reports, data_refresh_log
│   └── migrations/
│
└── specs/
    └── streetcheck/
        ├── spec.md               # Feature specification (user stories, FRs, success criteria)
        ├── plan.md               # Implementation plan (project structure, data model, API contracts)
        ├── clarify.md            # Design Q&A (10 resolved decisions)
        ├── data-model.md         # Full SQL schema + Prisma schema + OSM tag mapping
        ├── tasks.md              # 64 tasks across 7 phases with parallel markers
        └── contracts/
            ├── api-segments.md
            ├── api-reports.md
            ├── api-routes.md
            ├── api-ai.md
            └── ai-service.md
```

---

## Safety Score Model

Each road segment's composite safety score is computed as:

```
safety_score = (
  0.30 × lighting_score
  0.25 × (1 − accident_rate)
  0.20 × (1 − flood_risk)
  0.15 × surface_quality
  0.10 × walkability_score
)
```

All inputs normalised to `[0, 1]`. Final score maps to:

| Score | Band | Meaning |
|---|---|---|
| 75–100 | 🟢 Green | Generally safe |
| 45–74 | 🟡 Amber | Caution advised |
| 0–44 | 🔴 Red | Avoid if possible, especially at night |

Scoring weights are locked in `shared/src/scoring/weights.ts` — any change requires a `scoring_version` bump.

---

## API Overview

### Segments
- `GET /api/segments?bbox=minLng,minLat,maxLng,maxLat` — GeoJSON FeatureCollection for viewport
- `GET /api/segments/:id` — single segment with full score breakdown and active reports

### Reports
- `POST /api/reports` — submit a hazard report (triggers score update)
- `GET /api/reports?bbox=...` — active report pins for map overlay

### Routes
- `POST /api/routes` — compute fastest vs. safest route between origin and destination

### AI
- `POST /api/ai/assistant` — conversational safety Q&A (Claude + segment context)
- `POST /api/ai/summary` — 2-line natural language segment summary
- `POST /api/ai/explanation` — comparative route safety explanation

---

## Environment Variables

Copy `.env.example` to `.env` and provide real values.

```env
DATABASE_URL=
ANTHROPIC_API_KEY=
CLOUDINARY_URL=
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_SECRET=
OVERPASS_FULL_CITY=false
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 20
- Docker and Docker Compose
- Python 3.11 + `uv` (for AI service)

### 1. Start the database and AI service

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and other values
```

### 4. Push the Prisma schema

```bash
npm run prisma:push
```

### 5. Seed road data (Overpass API)

```bash
npm run seed:overpass
```

### 6. Start the app

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- AI micro-service: `http://localhost:8001`

---

## Available Scripts

At repository root:

| Script | Description |
|---|---|
| `npm run dev` | Start client + server in parallel |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express server only |
| `npm run build` | Production build (client + server) |
| `npm run lint` | ESLint across all workspaces |
| `npm run format` | Prettier format all files |
| `npm run format:check` | Prettier check (CI mode) |
| `npm run type-check` | TypeScript strict check |
| `npm run test` | Vitest unit + integration tests |
| `npm run coverage` | Test coverage report |
| `npm run audit` | npm audit for all workspaces |
| `npm run secrets:scan` | Gitleaks secret scan |
| `npm run knip` | Dead code and unused dependency check |
| `npm run changelog` | Generate changelog via git-cliff |
| `npm run prisma:push` | Push Prisma schema to database |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run seed:overpass` | Manually trigger Overpass API seed |

---

## Testing and Verification

Quality gates enforced in CI:

- ESLint for client and server TypeScript
- Prettier formatting check
- TypeScript strict type-check across all workspaces
- Vitest coverage thresholds (≥80% statements and lines on both client and server)
- `npm audit` — fails on high/critical findings
- Gitleaks secret scanning
- Knip dead-code check
- Husky + lint-staged pre-commit enforcement
- Python: Ruff + mypy on the AI service

Suggested local verification sequence:

```bash
npm install
npm run lint
npm run format:check
npm run type-check
npm test
npm run coverage
npm run audit
npm run knip
```

---

## Spec-Driven Development

This project uses [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven development. All design documents live under `specs/streetcheck/`:

- `spec.md` — user stories, functional requirements, success criteria
- `clarify.md` — 10 resolved design decisions before implementation began
- `plan.md` — full implementation plan with project structure, data model, API contracts
- `data-model.md` — complete SQL schema, Prisma model, and OSM tag mapping reference
- `tasks.md` — 64 ordered tasks across 7 phases with parallel markers

The constitution (project principles and non-negotiables) lives at `.specify/memory/constitution.md`.

---

## Deployment

### Frontend

Static Vite build deployed via GitHub Actions → GitHub Pages using `HashRouter`.

### Backend

Docker container deployed on [Render](https://render.com/) using the included `render.yaml`.

After deploying the backend, set `VITE_API_BASE_URL` to the live backend URL and redeploy the frontend:

```env
VITE_API_BASE_URL=https://streetcheck-api.onrender.com/api
```

### Recommended Production Topology

- Frontend demo: GitHub Pages
- Backend API: Docker on Render / Railway / Fly.io
- Database: Managed PostgreSQL with PostGIS extension
- AI micro-service: Docker container (co-located with backend)

---

## Security Notes

- No crime data, policing information, or socioeconomic indicators are included in any data layer or AI prompt — enforced by constitution
- All Claude API calls include a hard constraint: "Do not discuss crime or policing. Do not discuss areas outside Hyderabad."
- User location data is anonymised to road-segment level before any AI processing
- Anonymous reporting via client-generated UUID (`localStorage`) — no user accounts or PII stored
- Gitleaks runs on every push; no API keys in source
- Rate limiting: max 5 reports per 10 minutes per anonymous token
- Helmet security headers and CORS restriction to configured client origin

---

## Roadmap

1. Wire the `Report` flow to the backend submission endpoint
2. Connect the Leaflet map to live segment and report data from PostGIS
3. Implement the graphology routing graph with safety-weighted edges
4. Integrate Claude API for assistant, summary, and route explanation endpoints
5. Build the Python AI micro-service (NLP + CV pipeline)
6. Implement civic authority dashboard (top 20 worst segments, export)
7. Add integration and end-to-end tests
8. City authority partnerships and OSM contribution loop

---

## License

This project is licensed under the GNU Affero General Public License v3.0 or later. See [LICENSE](./LICENSE).
