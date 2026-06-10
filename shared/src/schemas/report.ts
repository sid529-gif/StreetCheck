import { z } from 'zod'
import { HazardTypeEnum } from './segment.js'

// ── Submit Report Request ────────────────────────────────────────────────────
export const SubmitReportSchema = z.object({
  segmentId: z.string().nullable().optional(),
  tapLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  hazardType: HazardTypeEnum,
  confirmedType: HazardTypeEnum,
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  aiSuggestedType: HazardTypeEnum.nullable().optional(),
  reporterToken: z.string().uuid({ message: 'reporterToken must be a valid UUID' }),
})
export type SubmitReportRequest = z.infer<typeof SubmitReportSchema>

// ── Report Response ──────────────────────────────────────────────────────────
export const ReportResponseSchema = z.object({
  reportId: z.string().uuid(),
  segmentId: z.string(),
  confirmedType: HazardTypeEnum,
  severityWeight: z.number().min(0).max(1),
  expiresAt: z.string().datetime(),
  updatedSegment: z.object({
    segmentId: z.string(),
    safetyScore: z.number(),
    safetyBand: z.enum(['green', 'amber', 'red']),
    activeReportCount: z.number().int(),
  }),
})
export type ReportResponse = z.infer<typeof ReportResponseSchema>

// ── Report bbox query ────────────────────────────────────────────────────────
export const ReportBboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  hazardType: HazardTypeEnum.optional(),
})
export type ReportBboxQuery = z.infer<typeof ReportBboxQuerySchema>

// ── Classify Text Request ────────────────────────────────────────────────────
export const ClassifyTextSchema = z.object({
  text: z.string().min(1).max(500),
})

// ── Detect Photo Request ─────────────────────────────────────────────────────
export const DetectPhotoSchema = z.object({
  photoUrl: z.string().url(),
})
