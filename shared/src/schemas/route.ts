import { z } from 'zod'

// ── Route Point (lat/lng or address) ────────────────────────────────────────
const RoutePointSchema = z
  .object({
    address: z.string().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((p) => p.address !== undefined || (p.lat !== undefined && p.lng !== undefined), {
    message: 'Provide either address or lat+lng',
  })

// ── Route Request ────────────────────────────────────────────────────────────
export const RouteRequestSchema = z.object({
  origin: RoutePointSchema,
  destination: RoutePointSchema,
})
export type RouteRequest = z.infer<typeof RouteRequestSchema>

// ── Hazard Summary (per route) ───────────────────────────────────────────────
const HazardSummarySchema = z.object({
  redSegments: z.number().int(),
  amberSegments: z.number().int(),
  greenSegments: z.number().int(),
  activeReports: z.number().int(),
})

// ── Single Route ─────────────────────────────────────────────────────────────
export const RouteSchema = z.object({
  label: z.string(),
  totalDistanceM: z.number(),
  estimatedTimeS: z.number(),
  estimatedTimeFormatted: z.string(),
  overallSafetyScore: z.number().min(0).max(100),
  safetyBand: z.enum(['green', 'amber', 'red']),
  segmentIds: z.array(z.string()),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  hazardSummary: HazardSummarySchema,
})
export type Route = z.infer<typeof RouteSchema>

// ── Route Response ───────────────────────────────────────────────────────────
export const RouteResponseSchema = z.object({
  fastest: RouteSchema,
  safest: RouteSchema,
  origin: z.object({ address: z.string().optional(), lat: z.number(), lng: z.number() }),
  destination: z.object({ address: z.string().optional(), lat: z.number(), lng: z.number() }),
})
export type RouteResponse = z.infer<typeof RouteResponseSchema>
