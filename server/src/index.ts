import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const PORT = Number(process.env['PORT'] ?? 5000)
const CLIENT_URL = process.env['CLIENT_URL'] ?? 'http://localhost:5173'

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'streetcheck-api', timestamp: new Date().toISOString() })
})

// ── Placeholder API routes (replaced in Phase 2+) ──────────────────────────
app.get('/api/segments', (_req, res) => {
  res.json({ type: 'FeatureCollection', features: [], meta: { count: 0, phase: '0-scaffold' } })
})

app.get('/api/segments/:id', (_req, res) => {
  res
    .status(404)
    .json({ error: 'SEGMENT_NOT_FOUND', message: 'Phase 0 scaffold — segments not yet seeded' })
})

app.post('/api/reports', (_req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Phase 0 scaffold — reports endpoint coming in Phase 5',
  })
})

app.get('/api/reports', (_req, res) => {
  res.json({ type: 'FeatureCollection', features: [], meta: { count: 0, phase: '0-scaffold' } })
})

app.post('/api/routes', (_req, res) => {
  res
    .status(501)
    .json({ error: 'NOT_IMPLEMENTED', message: 'Phase 0 scaffold — routing coming in Phase 4' })
})

app.post('/api/ai/assistant', (_req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Phase 0 scaffold — AI assistant coming in Phase 6',
  })
})

app.post('/api/ai/summary', (_req, res) => {
  res
    .status(501)
    .json({ error: 'NOT_IMPLEMENTED', message: 'Phase 0 scaffold — AI summary coming in Phase 6' })
})

app.post('/api/ai/explanation', (_req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Phase 0 scaffold — AI explanation coming in Phase 4',
  })
})

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' })
})

// ── Global error handler ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err.message)
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
})

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[streetcheck-api] listening on http://localhost:${PORT}`)
  console.log(`[streetcheck-api] health → http://localhost:${PORT}/health`)
})

export default app
