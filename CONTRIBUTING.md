# Contributing to StreetCheck

Thank you for helping make Hyderabad's roads safer.

## Before You Start

1. Read `AGENTS.md` — it contains the project constitution and non-negotiables
2. Read `specs/streetcheck/plan.md` — the authoritative implementation plan
3. Check `specs/streetcheck/tasks.md` for open tasks

## Constitutional Rules (non-negotiable)

- **No crime data** — StreetCheck covers civic infrastructure only. No crime rates,
  police beat data, or socioeconomic indicators. Ever.
- **No PII** — all reports are anonymous. No user accounts, no IP logging.
- **Scoring weights are locked** — changes to `shared/src/scoring/weights.ts` require
  a `scoring_version` bump and a discussion issue first.

## Development Setup

```bash
# 1. Clone and install
git clone https://github.com/sid529-gif/StreetCheck.git
cd StreetCheck
cp .env.example .env   # fill in your values

# 2. Start the database
docker-compose up -d db

# 3. Push schema and seed data
npm run prisma:push
npm run seed:overpass   # seeds ~70,000 Hyderabad road segments

# 4. Start dev servers
npm install
npm run dev             # starts client (port 5173) + server (port 5000) concurrently
```

Full setup: see `CI_SETUP.md` in the repo root.

## Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make changes, write tests
3. Run checks locally before pushing:
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run format:check
   ```
4. Open a Pull Request against `main`
5. CI must pass before merge

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add flood risk layer toggle
fix: correct segment bbox query for large viewports
chore: update overpass polling interval
docs: add API contract for /routes endpoint
```

Commits are parsed by `git-cliff` to generate `CHANGELOG.md`.

## Code Style

- TypeScript strict mode — no `any` without a comment explaining why
- All shared types defined in `shared/src/` with Zod schemas
- Tailwind only — no CSS modules, no inline styles except dynamic values
- All API responses must include Zod validation on both client and server

## Testing

```bash
npm test                # run all tests
npm run coverage        # coverage report (target: ≥ 80%)
```

## Data & AI Guidelines

- Claude API calls must always include the system prompt fragment:
  `"Do not discuss crime or policing. Do not discuss areas outside Hyderabad."`
- New hazard types must be added to `shared/src/schemas/report.ts` `HazardType` enum
- Scoring changes require updating both the formula and the `scoring_version` constant
