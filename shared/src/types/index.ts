// Re-export inferred TypeScript types from Zod schemas
// Import these instead of using z.infer<typeof SchemaName> directly

export type { HazardType, SafetyBand, RoadSegment, SegmentBboxQuery } from '../schemas/segment.js'

export type { SubmitReportRequest, ReportResponse, ReportBboxQuery } from '../schemas/report.js'

export type { RouteRequest, Route, RouteResponse } from '../schemas/route.js'

export type {
  AssistantRequest,
  AssistantResponse,
  SummaryRequest,
  SummaryResponse,
  ExplanationRequest,
  ExplanationResponse,
} from '../schemas/ai.js'

export type { ScoreInputs } from '../scoring/weights.js'
