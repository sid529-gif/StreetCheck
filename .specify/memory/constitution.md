# StreetCheck Constitution

## Core Principles

### I. Civic Data First
Every feature must be grounded in publicly verifiable civic data. No crime data, no socioeconomic indicators, no speculative inputs. Data sources must be one of: OSM/Overpass API, Telangana Open Data, HYDRAA shapefiles, MoRTH records, or StreetCheck citizen reports. Any new data source requires explicit justification against this list.

### II. Monorepo Workspace Architecture
The codebase lives in a single npm workspaces monorepo: `client/` (React 18 + Vite), `server/` (Node.js + Express), and `shared/` (Zod schemas + TypeScript types). The Python AI micro-service (`ai-service/`) is a standalone FastAPI process and does **not** share the npm workspace. All business logic lives in Node/Express — Python is scoped exclusively to the AI pipeline.

### III. Schema-Driven Contracts (NON-NEGOTIABLE)
All API request/response shapes are defined as Zod schemas in `shared/src/schemas/`. Both `client/` and `server/` import from `shared/` — never define schemas independently in either package. Breaking a Zod schema is a contract change and requires a version bump to the schema file. No `any` types in TypeScript.

### IV. Geospatial via PostGIS Only
All spatial queries (bounding-box lookups, nearest-road snapping, segment retrieval) use PostGIS via Prisma raw queries or the `pg` client. No in-memory GeoJSON filtering of large datasets. Road routing uses `graphology` (JS, server-side) with safety-weighted edges. Python NetworkX is explicitly prohibited.

### V. Safety Score Immutability Rules
The scoring formula weights are locked: lighting 0.30, accident_rate 0.25, flood_risk 0.20, surface_quality 0.15, walkability 0.10. Any change to weights requires updating `shared/src/scoring/weights.ts` and bumping the `scoring_version` field in the segment schema. Scores must always be recomputed from raw normalised sub-scores — never manually patched.

### VI. AI Calls via Claude API Only (Primary)
All LLM/vision calls use `claude-sonnet-4-20250514`. HuggingFace zero-shot and CLIP/YOLOv8 are heuristic fallbacks only — they must not be the primary path for any user-facing feature. The AI micro-service must return a `confidence` score; if `< 0.65` for CV detection, the user is prompted to manually confirm the hazard type.

### VII. Simplicity & Hackathon Velocity
YAGNI. No over-engineering. No authentication system beyond JWT. No multi-tenant architecture. No microservices beyond the single AI Python service. If a feature is not in the demo script (Section 8 of the brief), it is out of scope for v1. Every added dependency must be justified against the tech stack table in the brief.

## Technology Constraints

- **Language**: TypeScript 5.x strict mode (`strict: true`, `noUncheckedIndexedAccess: true`) in `client/`, `server/`, `shared/`
- **Python AI service**: Python 3.11, FastAPI, Ruff + Black + mypy
- **Database**: PostgreSQL ≥ 15 with PostGIS 3.x; accessed via Prisma ORM (schema-first) or raw `pg` for spatial queries
- **Maps**: `react-leaflet` + Leaflet GeoJSON for all map rendering; no Google Maps SDK
- **Routing**: `graphology` + `graphology-shortest-path` with safety-weighted edges; no external routing API calls
- **AI model**: `claude-sonnet-4-20250514` for all LLM, vision, and conversational features
- **Uploads**: Cloudinary SDK for photo uploads from citizen reports
- **Scheduler**: `node-cron` for Overpass API polling and data refresh jobs

## Development Workflow

- **Branching**: `main` is always deployable. Feature branches: `feat/[feature-name]`. Fix branches: `fix/[issue]`
- **Pre-commit**: Husky + lint-staged run ESLint, oxlint, Biome, Prettier, and TypeScript type-check on staged files
- **Tests**: Vitest for all unit and integration tests in `client/` and `server/`. No test = no merge for scoring engine changes
- **Dead code**: Knip runs in CI; any new dead export blocks the pipeline
- **Secrets**: Gitleaks runs on every push. No API keys in source. Use `.env` files, never commit them
- **Python**: Ruff + mypy must pass with zero errors before any AI service change is merged

## Governance

This constitution supersedes all other coding conventions. Any deviation must be documented as a `COMPLEXITY.md` entry with: (1) the principle violated, (2) why it was necessary, (3) what simpler alternatives were rejected and why.

All AI model calls must be reviewed to ensure no PII (personally identifiable information) is sent to external APIs. User location data is anonymised to road-segment level before any AI processing.

**Version**: 1.0.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-06-10
