<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

<!-- SPECKIT END -->

# StreetCheck — Agent Context

## What Is This Project

Civic road safety intelligence platform for Hyderabad. Per-road-segment safety scores from OSM, MoRTH, HYDRAA + real-time citizen hazard reports. React heatmap, fastest-vs-safest routing via `graphology`, Claude API assistant.

## Monorepo Layout

```
streetcheck-hackathon-project/
├── client/          React 18 + Vite + Tailwind + Leaflet (port 5173)
├── server/          Express + Prisma + PostGIS (port 5000)
├── shared/          Zod schemas + locked scoring weights
├── ai-service/      Python FastAPI — NLP + CV pipeline (port 8001)
├── prisma/          schema.prisma (road_segments, hazard_reports, data_refresh_log)
├── docker-compose.yml  postgres/PostGIS 16-3.4 + ai-service
└── specs/streetcheck/  all design docs (plan.md, tasks.md, data-model.md, contracts/)
```

## Key Commands

```bash
# Start everything
docker compose up -d       # PostGIS + ai-service
npm run dev                # client (5173) + server (5000) in parallel

# Database
npm run prisma:push        # push schema to running postgres
npm run prisma:generate    # regenerate Prisma client
npm run seed:overpass      # populate road_segments from Overpass API

# Quality
npm run type-check         # tsc --noEmit across all workspaces
npm run lint               # ESLint across all workspaces
npm run format:check       # Prettier check
npm run test               # Vitest across all workspaces
npm run format             # Prettier fix all files
```

## Constitution Rules (NON-NEGOTIABLE)

1. **No crime data** — no policing, crime stats, or socioeconomic indicators anywhere
2. **Claude constraint** — every Claude API call must include: `"Do not discuss crime or policing. Do not discuss areas outside Hyderabad."`
3. **No PII** — anonymous reporting only; `reporter_token` is a client-generated UUID from `localStorage`
4. **Scoring weights are locked** in `shared/src/scoring/weights.ts` — changing them requires bumping `SCORING_VERSION`
5. **TypeScript strict mode** across all workspaces — no `any` types
6. **All Zod schemas in `shared/`** — imported by both `client/` and `server/`
7. **All spatial queries via PostGIS** — use `$queryRaw` in Prisma; never compute geometry in JS
8. **Routing via `graphology`** only — no Python for routing logic

## Safety Score Formula (LOCKED)

```
safety_score = 0.30 × lighting_score
             + 0.25 × (1 − accident_rate)
             + 0.20 × (1 − flood_risk)
             + 0.15 × surface_quality
             + 0.10 × walkability_score
```

Bands: `green` ≥ 0.75 | `amber` ≥ 0.45 | `red` < 0.45

## Tech Stack Quick Reference

| Layer      | Tech                                                             |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React 18, Vite, Tailwind v3, react-leaflet, Zustand, React Query |
| Backend    | Express, Prisma, node-cron, graphology, @anthropic-ai/sdk        |
| Database   | PostgreSQL 16 + PostGIS 3.4 (Docker)                             |
| AI service | Python FastAPI, HuggingFace transformers, Claude Vision          |
| Shared     | Zod, TypeScript 5.x strict                                       |

## Environment Variables Needed

| Variable             | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`       | `postgresql://streetcheck:streetcheck_dev@localhost:5432/streetcheck` |
| `ANTHROPIC_API_KEY`  | Claude API key — get from console.anthropic.com                       |
| `AI_SERVICE_URL`     | `http://localhost:8001`                                               |
| `AI_SERVICE_SECRET`  | Shared secret between Express and Python service                      |
| `CLOUDINARY_URL`     | Photo upload (Phase 5+)                                               |
| `OVERPASS_FULL_CITY` | `false` = demo bbox only                                              |

## Phase Status

| Phase                                                  | Status      |
| ------------------------------------------------------ | ----------- |
| Phase 0 — Monorepo Scaffold                            | ✅ Complete |
| Phase 1 — Foundational (Overpass seed, scoring engine) | ⬜ Next     |
| Phase 2 — Heatmap (map + segment API)                  | ⬜          |
| Phase 3 — Routing (graphology)                         | ⬜          |
| Phase 4 — Citizen Reporting                            | ⬜          |
| Phase 5 — AI Assistant                                 | ⬜          |
| Phase 6 — Polish                                       | ⬜          |

## Key File Locations

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `specs/streetcheck/tasks.md`      | 64 tasks, 7 phases — primary execution guide |
| `specs/streetcheck/plan.md`       | Full tech blueprint                          |
| `specs/streetcheck/data-model.md` | SQL schema + OSM tag mapping                 |
| `specs/streetcheck/contracts/`    | API contract specs                           |
| `shared/src/scoring/weights.ts`   | Locked scoring formula                       |
| `shared/src/schemas/`             | All Zod schemas                              |
| `prisma/schema.prisma`            | DB models                                    |
| `server/src/index.ts`             | Express entry — add routes here              |
| `client/src/App.tsx`              | React router shell                           |
