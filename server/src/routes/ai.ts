import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db/prisma.js'
import { validate } from '../middleware/validate.js'
import {
  SummaryRequestSchema,
  ExplanationRequestSchema,
  AssistantRequestSchema,
  DetectPhotoSchema,
  getSafetyBand,
} from '@streetcheck/shared'
import {
  getSegmentSummary,
  getRouteExplanation,
  getAssistantResponse,
  detectHazard,
} from '../services/aiClient.js'
import type { SegmentDetail, SegmentContext } from '../services/aiClient.js'
import type { RouteOption } from '../services/routingService.js'

const router = Router()

// ── Rate Limiter ─────────────────────────────────────────────────────────────

const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token =
      req.header('x-anonymous-token') || req.header('anonymous-token') || req.ip || 'anonymous'
    return token
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many AI requests. Limit is 10 requests per minute.',
    })
  },
})

router.use(aiRateLimiter)

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineMeters([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function aggregateSegmentsToRouteOption(
  segmentIds: string[],
  label: string
): Promise<RouteOption> {
  const segments = await prisma.roadSegment.findMany({
    where: { id: { in: segmentIds } },
  })

  // Preserving route segment ordering
  const segmentMap = new Map(segments.map((s) => [s.id, s]))
  const orderedSegments = segmentIds
    .map((id) => segmentMap.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)

  let totalDistanceM = 0
  let weightedScoreSum = 0
  let red = 0
  let amber = 0
  let green = 0
  let activeReports = 0
  const coordinates: [number, number][] = []

  for (const seg of orderedSegments) {
    const geom = seg.geometry as any
    const coords = geom?.coordinates as [number, number][] | undefined
    let distM = 0
    if (coords && coords.length >= 2) {
      for (let i = 0; i < coords.length - 1; i++) {
        distM += haversineMeters(coords[i]!, coords[i + 1]!)
      }
    }
    if (distM === 0) distM = 50 // fallback

    totalDistanceM += distM
    weightedScoreSum += seg.safetyScore * distM
    activeReports += seg.activeReports

    if (seg.safetyBand === 'red') red++
    else if (seg.safetyBand === 'amber') amber++
    else green++

    if (coords) {
      if (coordinates.length === 0) {
        coordinates.push(...coords)
      } else {
        coordinates.push(...coords.slice(1))
      }
    }
  }

  const overallSafetyScore =
    totalDistanceM > 0 ? Math.round((weightedScoreSum / totalDistanceM) * 100) / 100 : 0

  // average speed 30 km/h
  const estimatedTimeS = Math.round((totalDistanceM / 30_000) * 3600)
  const mins = Math.floor(estimatedTimeS / 60)
  const secs = estimatedTimeS % 60
  const estimatedTimeFormatted = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`

  return {
    label,
    totalDistanceM: Math.round(totalDistanceM),
    estimatedTimeS,
    estimatedTimeFormatted,
    overallSafetyScore,
    safetyBand: getSafetyBand(overallSafetyScore),
    segmentIds,
    geometry: { type: 'LineString', coordinates },
    hazardSummary: {
      redSegments: red,
      amberSegments: amber,
      greenSegments: green,
      activeReports,
    },
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/summary
 * Expects: { segmentId: string }
 * Returns: { summary: string, segmentId: string }
 */
router.post(
  '/summary',
  validate(SummaryRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { segmentId } = req.body as { segmentId: string }

      const segment = await prisma.roadSegment.findUnique({
        where: { id: segmentId },
        include: {
          reports: {
            where: { expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      })

      if (!segment) {
        res.status(404).json({
          error: 'SEGMENT_NOT_FOUND',
          message: `No segment with id: ${segmentId}`,
        })
        return
      }

      const detail: SegmentDetail = {
        id: segment.id,
        osmWayId: segment.osmWayId?.toString() ?? null,
        name: segment.name,
        geometry: segment.geometry as any,
        bbox: segment.bbox as any,
        lightingScore: segment.lightingScore,
        accidentRate: segment.accidentRate,
        floodRisk: segment.floodRisk,
        surfaceQuality: segment.surfaceQuality,
        walkabilityScore: segment.walkabilityScore,
        safetyScore: segment.safetyScore,
        safetyBand: segment.safetyBand as 'green' | 'amber' | 'red',
        scoringVersion: segment.scoringVersion,
        osmHighway: segment.osmHighway,
        osmLit: segment.osmLit,
        osmSurface: segment.osmSurface,
        osmFootway: segment.osmFootway,
        osmSidewalk: segment.osmSidewalk,
        activeReports: segment.activeReports,
        reports: segment.reports.map((r) => ({
          id: r.id,
          segmentId: r.segmentId,
          hazardType: r.hazardType as any,
          description: r.description,
          photoUrl: r.photoUrl,
          confirmedType: r.hazardType as any,
          severityWeight: r.severityWeight,
          createdAt: r.createdAt.toISOString(),
          isActive: r.expiresAt > new Date(),
          expiresAt: r.expiresAt.toISOString(),
        })),
        lastUpdated: segment.updatedAt.toISOString(),
        lastOsmSync: segment.lastOsmSync.toISOString(),
        createdAt: segment.createdAt.toISOString(),
      }

      const summary = await getSegmentSummary(detail)
      res.json({ summary, segmentId })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/ai/explanation
 * Expects: { fastestSegments: string[], safestSegments: string[] }
 * Returns: { explanation: string }
 */
router.post(
  '/explanation',
  validate(ExplanationRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fastestSegments, safestSegments } = req.body as {
        fastestSegments: string[]
        safestSegments: string[]
      }

      const [fastestRouteOption, safestRouteOption] = await Promise.all([
        aggregateSegmentsToRouteOption(fastestSegments, 'Fastest'),
        aggregateSegmentsToRouteOption(safestSegments, 'Safest'),
      ])

      const explanation = await getRouteExplanation(fastestRouteOption, safestRouteOption)
      res.json({ explanation })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/ai/assistant
 * Expects: { question: string, bbox?: [number, number, number, number] }
 * Returns: { answer: string }
 */
router.post(
  '/assistant',
  validate(AssistantRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, bbox } = req.body as {
        question: string
        bbox?: [number, number, number, number]
      }

      let context: SegmentContext[] = []

      if (bbox && bbox.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = bbox
        const segments = await prisma.$queryRaw<any[]>`
          SELECT *
          FROM road_segments
          WHERE
            (bbox->>'minLng')::float <= ${maxLng}
            AND (bbox->>'maxLng')::float >= ${minLng}
            AND (bbox->>'minLat')::float <= ${maxLat}
            AND (bbox->>'maxLat')::float >= ${minLat}
          ORDER BY safety_score ASC
          LIMIT 10
        `
        context = segments.map((seg) => ({
          id: seg.id,
          name: seg.name,
          safetyScore: seg.safetyScore,
          safetyBand: seg.safetyBand,
          lightingScore: seg.lightingScore,
          accidentRate: seg.accidentRate,
          floodRisk: seg.floodRisk,
          surfaceQuality: seg.surfaceQuality,
          walkabilityScore: seg.walkabilityScore,
          activeReports: seg.activeReports,
        }))
      }

      const answer = await getAssistantResponse(question, context)
      res.json({ answer })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/ai/detect-photo
 * Expects: { photoUrl: string }
 * Returns: { suggestedType: HazardType | null, confidence: number }
 */
router.post(
  '/detect-photo',
  validate(DetectPhotoSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { photoUrl } = req.body as { photoUrl: string }
      const result = await detectHazard(photoUrl)
      res.json({
        suggestedType: result.hazardType,
        confidence: result.confidence,
        fallbackUsed: result.fallbackUsed,
        model: result.model,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
