# CI Setup Guide

Complete guide for setting up the StreetCheck development environment and CI/CD pipeline.

## Local Development

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- Docker + Docker Compose
- Python 3.11+ (for AI service)
- Git

### First-Time Setup

```bash
git clone https://github.com/sid529-gif/StreetCheck.git
cd StreetCheck

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY, Cloudinary credentials

# Start PostgreSQL + PostGIS
docker-compose up -d db

# Wait for DB to be ready, then push schema
sleep 5
npm run prisma:push

# Seed Hyderabad road data (~70,000 segments, takes 2–3 minutes)
npm run seed:overpass

# Install all workspace dependencies
npm install

# Start both client and server in dev mode
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:5000
# API health: http://localhost:5000/api/health
```

### Start AI Service (optional, needed for CV/NLP features)

```bash
docker-compose up -d ai-service
# AI service: http://localhost:8001
```

## CI/CD Pipeline

StreetCheck uses GitHub Actions with two workflows:

### 1. CI (`ci.yml`) — runs on every push and PR

Stages (in order):

1. `lint` — ESLint + oxlint
2. `format` — Prettier check
3. `type-check` — TypeScript build check
4. `test` — Vitest (client + server)
5. `coverage` — coverage report (≥ 80% required)
6. `audit` — npm audit (no high/critical)
7. `secrets` — Gitleaks scan
8. `python-security` — Bandit static analysis on ai-service/

### 2. Deploy (`deploy.yml`) — runs on push to `main`

1. Runs full CI suite
2. Builds client with Vite
3. Deploys to GitHub Pages

## GitHub Pages Setup

See the "GitHub Pages Authentication" section below for the one-time setup.

## Environment Variables

See `.env.example` for all required variables with descriptions.
Required for full functionality: `DATABASE_URL`, `ANTHROPIC_API_KEY`.
Optional for demo: `CLOUDINARY_URL`, `AI_SERVICE_SECRET`.
