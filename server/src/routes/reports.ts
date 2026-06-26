import { HazardTypeEnum } from '@streetcheck/shared'
import axios from 'axios'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { getNearestSegment } from '../db/geoQueries.js'
import { prisma } from '../db/prisma.js'
import { env } from '../env.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { classifyReport, detectHazard } from '../services/aiClient.js'
import { recalculateSegmentScore } from '../services/scoringEngine.js'
import { getAiConfig } from './ai.js'

const router = Router()

// ── Rate limiter — in-memory per anonymousToken ───────────────────────────────

const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT = 5

const rateLimitMap = new Map<string, number[]>()

function isRateLimited(token: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(token) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) return true
  timestamps.push(now)
  rateLimitMap.set(token, timestamps)
  return false
}

// Clean up expired entries every 15 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [token, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < RATE_WINDOW_MS)
      if (valid.length === 0) rateLimitMap.delete(token)
      else rateLimitMap.set(token, valid)
    }
  },
  15 * 60 * 1000
)

// ── Severity weights by hazard type ──────────────────────────────────────────

const SEVERITY_WEIGHT: Record<string, number> = {
  waterlogging: 0.9,
  open_manhole: 0.85,
  broken_streetlight: 0.7,
  construction_debris: 0.65,
  pothole: 0.6,
  broken_footpath: 0.5,
  stray_animals: 0.4,
}

// ── Expiry duration by hazard type ────────────────────────────────────────────

const EXPIRY_HOURS: Record<string, number> = {
  waterlogging: 72,
  construction_debris: 72,
  open_manhole: 168,
  broken_streetlight: 168,
  pothole: 168,
  broken_footpath: 168,
  stray_animals: 24,
}

// ── Request schema ────────────────────────────────────────────────────────────

const SubmitReportSchema = z.object({
  reporterToken: z.string().uuid({ message: 'reporterToken must be a valid UUID' }),
  lat: z.number().min(17.0).max(18.0), // Hyderabad lat range
  lng: z.number().min(78.0).max(79.0), // Hyderabad lng range
  hazardType: HazardTypeEnum,
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  aiSuggestedType: HazardTypeEnum.nullable().optional(),
})

type SubmitReportBody = z.infer<typeof SubmitReportSchema>

const BboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  hazardType: HazardTypeEnum.optional(),
})

// ── POST /api/reports ─────────────────────────────────────────────────────────

router.post('/', validate(SubmitReportSchema), async (req: Request, res: Response) => {
  const body = req.body as SubmitReportBody

  // Rate limit check
  if (isRateLimited(body.reporterToken)) {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many reports. Maximum 5 per 10 minutes per device.',
    })
    return
  }

  // Snap to nearest road segment
  const segment = await getNearestSegment(body.lat, body.lng)
  if (!segment) {
    res.status(422).json({
      error: 'NO_SEGMENT_NEARBY',
      message: 'No road segment found near the reported location.',
    })
    return
  }

  // AI classification (fire-and-forget if service is unavailable)
  let nlpHazardType: string | null = null
  let nlpConfidence: number | null = null
  let cvHazardType: string | null = null
  let cvConfidence: number | null = null

  const aiConfig = getAiConfig(req)

  if (body.description) {
    try {
      if (aiConfig.provider === 'server') {
        if (env.AI_SERVICE_URL) {
          const resp = await axios.post<{ hazardType: string; confidence: number }>(
            `${env.AI_SERVICE_URL}/classify`,
            { text: body.description },
            { timeout: 5000, headers: { 'X-Service-Secret': env.AI_SERVICE_SECRET } }
          )
          nlpHazardType = resp.data.hazardType
          nlpConfidence = resp.data.confidence
        }
      } else {
        const result = await classifyReport(body.description, aiConfig)
        nlpHazardType = result.hazardType
        nlpConfidence = result.confidence
      }
    } catch {
      // AI service is optional — continue without it
    }
  }

  if (body.photoUrl) {
    try {
      if (aiConfig.provider === 'server') {
        if (env.AI_SERVICE_URL) {
          const resp = await axios.post<{
            hazardType: string | null
            confidence: number
            description?: string
          }>(
            `${env.AI_SERVICE_URL}/detect`,
            { photo_url: body.photoUrl },
            { timeout: 10000, headers: { 'X-Service-Secret': env.AI_SERVICE_SECRET } }
          )
          cvHazardType = resp.data.hazardType
          cvConfidence = resp.data.confidence
        }
      } else {
        const result = await detectHazard(body.photoUrl, aiConfig)
        cvHazardType = result.hazardType
        cvConfidence = result.confidence
      }
    } catch {
      // AI service is optional — continue without it
    }
  }

  // Auto-Suggest Override Logic
  let finalHazardType = body.hazardType
  if (cvHazardType && cvConfidence !== null && cvConfidence >= 0.8) {
    const isManualSelection = body.aiSuggestedType ? body.hazardType !== body.aiSuggestedType : true
    if (!isManualSelection) {
      finalHazardType = cvHazardType as any
    }
  }

  const severityWeight = SEVERITY_WEIGHT[finalHazardType] ?? 0.5
  const expiryHours = EXPIRY_HOURS[finalHazardType] ?? 72
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

  // Create report & increment activeReports atomically
  const report = await prisma.hazardReport.create({
    data: {
      anonymousToken: body.reporterToken,
      segmentId: segment.id,
      hazardType: finalHazardType,
      severityWeight,
      lat: body.lat,
      lng: body.lng,
      expiresAt,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
      ...(nlpHazardType !== null ? { nlpHazardType, nlpConfidence } : {}),
      ...(cvHazardType !== null ? { cvHazardType, cvConfidence } : {}),
    },
  })

  await prisma.roadSegment.update({
    where: { id: segment.id },
    data: { activeReports: { increment: 1 } },
  })

  // Recalculate safety score with new report penalty
  await recalculateSegmentScore(segment.id)

  const updated = await prisma.roadSegment.findUniqueOrThrow({
    where: { id: segment.id },
    select: { id: true, safetyScore: true, safetyBand: true, activeReports: true },
  })

  res.status(201).json({
    reportId: report.id,
    segmentId: segment.id,
    hazardType: report.hazardType,
    severityWeight: report.severityWeight,
    expiresAt: report.expiresAt.toISOString(),
    updatedSegment: {
      segmentId: updated.id,
      safetyScore: updated.safetyScore,
      safetyBand: updated.safetyBand,
      activeReportCount: updated.activeReports,
    },
  })
})

// ── GET /api/reports?bbox=... ─────────────────────────────────────────────────

router.get('/', validateQuery(BboxQuerySchema), async (req: Request, res: Response) => {
  const query = (req as Request & { parsedQuery: z.infer<typeof BboxQuerySchema> }).parsedQuery
  const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number) as [
    number,
    number,
    number,
    number,
  ]

  const now = new Date()

  const reports = await prisma.hazardReport.findMany({
    where: {
      expiresAt: { gt: now },
      lat: { gte: minLat, lte: maxLat },
      lng: { gte: minLng, lte: maxLng },
      ...(query.hazardType ? { hazardType: query.hazardType } : {}),
    },
    select: {
      id: true,
      lat: true,
      lng: true,
      hazardType: true,
      severityWeight: true,
      segmentId: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  res.json({
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature' as const,
      id: r.id,
      geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        hazardType: r.hazardType,
        severityWeight: r.severityWeight,
        segmentId: r.segmentId,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
      },
    })),
    meta: { count: reports.length },
  })
})

export default router
