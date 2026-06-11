import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { computeRoutes } from '../services/routingService.js'
import { validate } from '../middleware/validate.js'

const router = Router()

// ── Request schema ────────────────────────────────────────────────────────────

const RoutePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const RouteRequestSchema = z.object({
  origin: RoutePointSchema,
  destination: RoutePointSchema,
})

type RouteRequestBody = z.infer<typeof RouteRequestSchema>

// ── POST /api/routes ──────────────────────────────────────────────────────────

router.post('/', validate(RouteRequestSchema), async (req: Request, res: Response) => {
  const body = req.body as RouteRequestBody

  const { origin, destination } = body

  // Quick sanity check — coordinates must be distinct
  if (
    Math.abs(origin.lat - destination.lat) < 0.0001 &&
    Math.abs(origin.lng - destination.lng) < 0.0001
  ) {
    res.status(400).json({
      error: 'SAME_LOCATION',
      message: 'Origin and destination must be different locations.',
    })
    return
  }

  const result = await computeRoutes({ origin, destination })

  res.json({
    fastest: result.fastest,
    safest: result.safest,
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
  })
})

export default router
