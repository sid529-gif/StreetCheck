import { Anthropic } from '@anthropic-ai/sdk'
import axios from 'axios'
import { env } from '../env.js'
import type { HazardType } from '@streetcheck/shared'
import type { RouteOption } from './routingService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClassifyResult {
  hazardType: HazardType | null
  confidence: number
  severityWeight?: number
  model?: string
  processingMs?: number
}

export interface DetectResult {
  hazardType: HazardType | null
  confidence: number
  description?: string
  fallbackUsed?: boolean
  model?: string
  processingMs?: number
}

export interface SegmentReport {
  id: string
  segmentId: string
  hazardType: HazardType
  description: string | null
  photoUrl: string | null
  confirmedType: HazardType
  severityWeight: number
  createdAt: string
  isActive: boolean
  expiresAt: string
}

export interface SegmentDetail {
  id: string
  osmWayId: string | null
  name: string | null
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  bbox: {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
  }
  lightingScore: number
  accidentRate: number
  floodRisk: number
  surfaceQuality: number
  walkabilityScore: number
  safetyScore: number
  safetyBand: 'green' | 'amber' | 'red'
  scoringVersion: number
  osmHighway: string | null
  osmLit: string | null
  osmSurface: string | null
  osmFootway: string | null
  osmSidewalk: string | null
  activeReports: number
  reports: SegmentReport[]
  lastUpdated: string
  lastOsmSync: string
  createdAt: string
}

export interface SegmentContext {
  id: string
  name: string | null
  safetyScore: number
  safetyBand: string
  lightingScore: number
  accidentRate: number
  floodRisk: number
  surfaceQuality: number
  walkabilityScore: number
  activeReports: number
}

// ── Initialization ────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || process.env['ANTHROPIC_API_KEY'] || '',
})

const SYSTEM_PROMPT = `You are a road safety assistant for StreetCheck, a civic road safety platform in Hyderabad, India.
You only discuss road safety, civic infrastructure, and navigation within Hyderabad.
Do not discuss crime or policing.
Do not discuss areas outside Hyderabad.
Be concise. Respond in 2-3 sentences unless a longer answer is clearly needed.`

// ── Service Endpoints ──────────────────────────────────────────────────────────

/**
 * Calls the Python microservice to classify report description text.
 */
export async function classifyReport(description: string): Promise<ClassifyResult> {
  const response = await axios.post<ClassifyResult>(
    `${env.AI_SERVICE_URL}/classify`,
    { text: description },
    {
      headers: {
        'X-Service-Secret': env.AI_SERVICE_SECRET,
      },
    }
  )
  return response.data
}

/**
 * Calls the Python microservice to detect hazards from a photo URL.
 */
export async function detectHazard(photoUrl: string): Promise<DetectResult> {
  const response = await axios.post<DetectResult>(
    `${env.AI_SERVICE_URL}/detect`,
    { photoUrl },
    {
      headers: {
        'X-Service-Secret': env.AI_SERVICE_SECRET,
      },
    }
  )
  return response.data
}

/**
 * Summarizes safety conditions of a segment by calling Claude directly.
 */
export async function getSegmentSummary(segment: SegmentDetail): Promise<string> {
  const prompt = `Summarize the safety conditions of the road segment "${segment.name || 'Unnamed Street'}" in Hyderabad.
Here are the safety metrics (normalized 0.0 to 1.0, where higher is safer/better, except floodRisk and accidentRate where higher is more hazardous):
- Safety Score: ${segment.safetyScore} (${segment.safetyBand})
- Lighting Score: ${segment.lightingScore}
- Walkability Score: ${segment.walkabilityScore}
- Surface Quality Score: ${segment.surfaceQuality}
- Flood Risk: ${segment.floodRisk}
- Accident Rate: ${segment.accidentRate}
- Active Citizen Hazard Reports: ${segment.activeReports}
- Road classification: ${segment.osmHighway || 'unknown'}

Please provide a brief, professional summary of this segment's safety conditions for a citizen.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const contentBlock = response.content[0]
  if (contentBlock && contentBlock.type === 'text') {
    return contentBlock.text
  }
  throw new Error('Unexpected empty response from Claude API')
}

/**
 * Compares two routes and generates a comparison explanation by calling Claude directly.
 */
export async function getRouteExplanation(
  fastest: RouteOption,
  safest: RouteOption
): Promise<string> {
  const prompt = `Compare these two route options in Hyderabad:

Route 1: Fastest
- Label: ${fastest.label}
- Distance: ${fastest.totalDistanceM} meters
- Travel Time: ${fastest.estimatedTimeFormatted}
- Overall Safety Score: ${fastest.overallSafetyScore} (${fastest.safetyBand})
- Hazard Summary: ${fastest.hazardSummary.redSegments} red segments, ${fastest.hazardSummary.amberSegments} amber segments, ${fastest.hazardSummary.greenSegments} green segments, ${fastest.hazardSummary.activeReports} active hazard reports

Route 2: Safest
- Label: ${safest.label}
- Distance: ${safest.totalDistanceM} meters
- Travel Time: ${safest.estimatedTimeFormatted}
- Overall Safety Score: ${safest.overallSafetyScore} (${safest.safetyBand})
- Hazard Summary: ${safest.hazardSummary.redSegments} red segments, ${safest.hazardSummary.amberSegments} amber segments, ${safest.hazardSummary.greenSegments} green segments, ${safest.hazardSummary.activeReports} active hazard reports

Please compare these options and explain why the safest route is safer, highlighting the differences in safety scores and hazards.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const contentBlock = response.content[0]
  if (contentBlock && contentBlock.type === 'text') {
    return contentBlock.text
  }
  throw new Error('Unexpected empty response from Claude API')
}

/**
 * Generates response for the floating chatbot grounded in local segment context.
 */
export async function getAssistantResponse(
  question: string,
  context: SegmentContext[]
): Promise<string> {
  const prompt = `User Question: "${question}"

Context on nearby road segments in Hyderabad:
${context
  .map(
    (seg, idx) =>
      `Segment ${idx + 1}: ${seg.name || 'Unnamed Street'} (Score: ${seg.safetyScore}, Band: ${seg.safetyBand}, Lighting: ${seg.lightingScore}, Flood Risk: ${seg.floodRisk}, Active Reports: ${seg.activeReports})`
  )
  .join('\n')}

Please answer the user's question based on the provided segment context. Keep the response factual and aligned with Hyderabad navigation and safety.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const contentBlock = response.content[0]
  if (contentBlock && contentBlock.type === 'text') {
    return contentBlock.text
  }
  throw new Error('Unexpected empty response from Claude API')
}
