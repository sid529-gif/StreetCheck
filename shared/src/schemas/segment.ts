import { z } from 'zod'

// ── Hazard Type Enum ─────────────────────────────────────────────────────────
export const HazardTypeEnum = z.enum([
  'pothole',
  'broken_streetlight',
  'waterlogging',
  'construction_debris',
  'stray_animals',
  'broken_footpath',
  'open_manhole',
])
export type HazardType = z.infer<typeof HazardTypeEnum>

// ── Safety Band Enum ─────────────────────────────────────────────────────────
export const SafetyBandEnum = z.enum(['green', 'amber', 'red'])
export type SafetyBand = z.infer<typeof SafetyBandEnum>

// ── Road Segment ─────────────────────────────────────────────────────────────
export const RoadSegmentSchema = z.object({
  segmentId: z.string(),
  osmWayId: z.number().int().nullable().optional(),
  name: z.string().nullable().optional(),
  lightingScore: z.number().min(0).max(1),
  accidentRate: z.number().min(0).max(1),
  floodRisk: z.number().min(0).max(1),
  surfaceQuality: z.number().min(0).max(1),
  walkabilityScore: z.number().min(0).max(1),
  safetyScore: z.number().min(0).max(1),
  safetyBand: SafetyBandEnum,
  scoringVersion: z.number().int().default(1),
  activeReportCount: z.number().int().min(0).default(0),
  lastUpdated: z.string().datetime(),
  dataSources: z.array(z.string()),
})
export type RoadSegment = z.infer<typeof RoadSegmentSchema>

// ── Segment Query (bbox param) ───────────────────────────────────────────────
export const SegmentBboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/, {
    message: 'bbox must be minLng,minLat,maxLng,maxLat',
  }),
  band: SafetyBandEnum.optional(),
})
export type SegmentBboxQuery = z.infer<typeof SegmentBboxQuerySchema>
