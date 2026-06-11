import { z } from 'zod'

// ── AI Assistant ─────────────────────────────────────────────────────────────
export const AssistantRequestSchema = z.object({
  question: z.string().min(1).max(500),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
})
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>

export const AssistantResponseSchema = z.object({
  response: z.string(),
  segmentsUsed: z.array(z.string()),
  dataAge: z.string().datetime().optional(),
})
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>

// ── AI Summary ───────────────────────────────────────────────────────────────
export const SummaryRequestSchema = z.object({
  segmentId: z.string(),
})
export type SummaryRequest = z.infer<typeof SummaryRequestSchema>

export const SummaryResponseSchema = z.object({
  summary: z.string(),
  segmentId: z.string(),
})
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>

// ── AI Route Explanation ─────────────────────────────────────────────────────
export const ExplanationRequestSchema = z.object({
  fastestSegments: z.array(z.string()),
  safestSegments: z.array(z.string()),
})
export type ExplanationRequest = z.infer<typeof ExplanationRequestSchema>

export const ExplanationResponseSchema = z.object({
  explanation: z.string(),
})
export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>
