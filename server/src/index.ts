import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import winston from 'winston'
import { env } from './env.js'

// ── Logger ────────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize({ all: true }), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
})

// ── App ───────────────────────────────────────────────────────────────────────

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet())
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`)
  next()
})

// Global rate limiter — 200 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
})
app.use(globalLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────

import segmentsRouter from './routes/segments.js'
import reportsRouter from './routes/reports.js'
import routesRouter from './routes/routes.js'
import aiRouter from './routes/ai.js'
import statsRouter from './routes/stats.js'

app.use('/api/segments', segmentsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/routes', routesRouter)
app.use('/api/ai', aiRouter)
app.use('/api/stats', statsRouter)

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'streetcheck-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'streetcheck-api', timestamp: new Date().toISOString() })
})

// ── 404 ───────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' })
})

// ── Global error handler ──────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack })
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
})

// ── Start ─────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Start cron jobs
  const { startOverpassJob } = await import('./jobs/overpassJob.js')
  const { startReportExpiryJob } = await import('./jobs/reportExpiryJob.js')
  startOverpassJob()
  startReportExpiryJob()

  // Warm up routing graph in background (don't block startup)
  import('./services/routingService.js')
    .then(({ buildRoutingGraph }) => buildRoutingGraph())
    .catch((err: unknown) => logger.warn('[startup] Routing graph build failed', { err }))

  app.listen(env.PORT, () => {
    logger.info(`[streetcheck-api] listening on http://localhost:${env.PORT}`)
    logger.info(`[streetcheck-api] health → http://localhost:${env.PORT}/api/health`)
    logger.info(`[streetcheck-api] NODE_ENV=${env.NODE_ENV}`)
  })
}

start().catch((err: unknown) => {
  logger.error('Fatal startup error', { err })
  process.exit(1)
})

export default app
