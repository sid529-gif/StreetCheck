import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/prisma.js'
import { getSegmentsByBbox } from '../db/geoQueries.js'
import { validateQuery } from '../middleware/validate.js'

const router = Router()

// ── Bbox query schema ─────────────────────────────────────────────────────────

const BboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/, {
    message: 'bbox must be: minLng,minLat,maxLng,maxLat',
  }),
  band: z.enum(['green', 'amber', 'red']).optional(),
})

// ── GET /api/segments?bbox=minLng,minLat,maxLng,maxLat ───────────────────────

router.get('/', validateQuery(BboxQuerySchema), async (req: Request, res: Response) => {
  const query = (req as Request & { parsedQuery: z.infer<typeof BboxQuerySchema> }).parsedQuery
  const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number) as [
    number,
    number,
    number,
    number,
  ]

  // Validate coordinate ranges
  if (minLng >= maxLng || minLat >= maxLat) {
    res.status(400).json({
      error: 'INVALID_BBOX',
      message: 'minLng must be < maxLng and minLat must be < maxLat',
    })
    return
  }

  const rows = await getSegmentsByBbox(minLng, minLat, maxLng, maxLat)

  // Optional band filter
  const filtered = query.band ? rows.filter((r) => r.safetyBand === query.band) : rows

  // Cap at 500 features
  const capped = filtered.slice(0, 500)

  const features = capped.map((seg) => ({
    type: 'Feature' as const,
    id: seg.id,
    geometry: typeof seg.geometry === 'string' ? JSON.parse(seg.geometry) : seg.geometry,
    properties: {
      id: seg.id,
      safetyScore: seg.safetyScore,
      safetyBand: seg.safetyBand,
      activeReports: seg.activeReports,
      osmHighway: seg.osmHighway,
      osmLit: seg.osmLit,
      name: seg.name,
      lightingScore: seg.lightingScore,
      accidentRate: seg.accidentRate,
      floodRisk: seg.floodRisk,
      surfaceQuality: seg.surfaceQuality,
      walkabilityScore: seg.walkabilityScore,
    },
  }))

  res.json({
    type: 'FeatureCollection',
    features,
    meta: {
      total: filtered.length,
      returned: capped.length,
      capped: filtered.length > 500,
    },
  })
})

// ── GET /api/segments/:id ─────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const segment = await prisma.roadSegment.findUnique({
    where: { id },
    include: {
      reports: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  })

  if (!segment) {
    res.status(404).json({ error: 'SEGMENT_NOT_FOUND', message: `No segment with id: ${id}` })
    return
  }

  res.json({
    id: segment.id,
    osmWayId: segment.osmWayId?.toString() ?? null,
    name: segment.name,
    geometry: segment.geometry,
    bbox: segment.bbox,
    // Score dimensions
    lightingScore: segment.lightingScore,
    accidentRate: segment.accidentRate,
    floodRisk: segment.floodRisk,
    surfaceQuality: segment.surfaceQuality,
    walkabilityScore: segment.walkabilityScore,
    // Computed
    safetyScore: segment.safetyScore,
    safetyBand: segment.safetyBand,
    scoringVersion: segment.scoringVersion,
    // OSM tags
    osmHighway: segment.osmHighway,
    osmLit: segment.osmLit,
    osmSurface: segment.osmSurface,
    osmFootway: segment.osmFootway,
    osmSidewalk: segment.osmSidewalk,
    // Reports
    activeReports: segment.activeReports,
    reports: segment.reports,
    // Timestamps
    lastUpdated: segment.updatedAt.toISOString(),
    lastOsmSync: segment.lastOsmSync.toISOString(),
    createdAt: segment.createdAt.toISOString(),
  })
})

export default router
