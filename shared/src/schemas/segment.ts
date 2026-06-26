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

// ── Road Segment — OSM Madhapur/Hitech City scope ────────────────────────────
// safetyScore is an integer 0–100 derived from OSM proximity indicators.
// safetyBand: green > 75 | amber > 45 | red ≤ 45
export const RoadSegmentSchema = z.object({
  segmentId: z.string(),
  osmWayId: z.number().int().nullable().optional(),
  name: z.string().nullable().optional(),
  // ── Five OSM proximity / infrastructure indicators (each 0–100) ───────────
  school: z.number().min(0).max(100),
  hospital: z.number().min(0).max(100),
  park: z.number().min(0).max(100),
  bus_stop: z.number().min(0).max(100),
  footpath: z.number().min(0).max(100),
  // ── Composite ─────────────────────────────────────────────────────────────
  safetyScore: z.number().min(0).max(100),
  safetyBand: SafetyBandEnum,
  scoringVersion: z.number().int().default(3),
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
