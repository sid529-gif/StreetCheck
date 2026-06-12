import { Anthropic } from '@anthropic-ai/sdk'
import axios from 'axios'
import { env } from '../env.js'
import type { HazardType } from '@streetcheck/shared'
import type { RouteOption } from './routingService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiConfig {
  provider: 'server' | 'ollama' | 'byok'
  apiKey?: string
  ollamaHost?: string
  ollamaModel?: string
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a road safety assistant for StreetCheck, a civic road safety platform in Hyderabad, India.
You only discuss road safety, civic infrastructure, and navigation within Hyderabad.
Do not discuss crime or policing.
Do not discuss areas outside Hyderabad.
Be concise. Respond in 2-3 sentences unless a longer answer is clearly needed.`

function getAnthropicClient(config: AiConfig) {
  if (config.provider === 'byok' && config.apiKey) {
    return new Anthropic({ apiKey: config.apiKey })
  }
  return new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY || process.env['ANTHROPIC_API_KEY'] || '',
  })
}

async function queryOllama(config: AiConfig, system: string, prompt: string): Promise<string> {
  const host = config.ollamaHost || 'http://localhost:11434'
  const model = config.ollamaModel || 'qwen3:1.7b'

  const response = await axios.post<{ message: { content: string } }>(
    `${host}/api/chat`,
    {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      stream: false,
    },
    { timeout: 15000 }
  )
  return response.data.message.content
}

async function classifyWithOllama(config: AiConfig, text: string): Promise<ClassifyResult> {
  const prompt = `Classify this road hazard description: "${text}"

Choose EXACTLY one type from this list:
pothole | broken_streetlight | waterlogging | construction_debris | stray_animals | broken_footpath | open_manhole

Return ONLY raw JSON in this format:
{"hazardType":"<type>","confidence":<0.0-1.0>}`

  try {
    const responseText = await queryOllama(
      config,
      'You are a road safety classification helper.',
      prompt
    )
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const data = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1))
      const hz = data.hazardType
      const VALID_TYPES = [
        'pothole',
        'broken_streetlight',
        'waterlogging',
        'construction_debris',
        'stray_animals',
        'broken_footpath',
        'open_manhole',
      ]
      if (VALID_TYPES.includes(hz)) {
        return {
          hazardType: hz as HazardType,
          confidence: Number(data.confidence) || 0.9,
          model: config.ollamaModel || 'qwen3:1.7b',
        }
      }
    }
  } catch (err) {
    console.error('Ollama NLP classification failed:', err)
  }

  return { hazardType: null, confidence: 0 }
}

async function classifyWithClaude(apiKey: string, text: string): Promise<ClassifyResult> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    temperature: 0.0,
    system:
      'You are a civic road safety assistant for Hyderabad. Do not discuss crime or policing.',
    messages: [
      {
        role: 'user',
        content: `Classify this road hazard description: "${text}"
Choose EXACTLY one type:
pothole | broken_streetlight | waterlogging | construction_debris | stray_animals | broken_footpath | open_manhole

Return ONLY raw JSON (no markdown, no extra text):
{"hazardType":"<type>","confidence":<0.0-1.0>}`,
      },
    ],
  })

  const contentBlock = response.content[0]
  if (contentBlock && contentBlock.type === 'text') {
    try {
      const data = JSON.parse(contentBlock.text.trim())
      return {
        hazardType: data.hazardType,
        confidence: data.confidence,
        model: 'claude-byok',
      }
    } catch {
      // JSON parse failed
    }
  }
  return { hazardType: null, confidence: 0 }
}

async function detectWithClaudeBYOK(apiKey: string, photoUrl: string): Promise<DetectResult> {
  const client = new Anthropic({ apiKey })

  const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' })
  const base64Image = Buffer.from(imageResponse.data).toString('base64')

  let mediaType = 'image/jpeg'
  if (photoUrl.toLowerCase().endsWith('.png')) mediaType = 'image/png'
  else if (photoUrl.toLowerCase().endsWith('.webp')) mediaType = 'image/webp'
  else if (photoUrl.toLowerCase().endsWith('.gif')) mediaType = 'image/gif'

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    temperature: 0.0,
    system: 'You are a road safety hazard detector. Do not discuss crime or policing.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as any,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Identify the road safety hazard in this image.
Choose EXACTLY one type:
pothole | broken_streetlight | waterlogging | construction_debris | stray_animals | broken_footpath | open_manhole

Return ONLY raw JSON:
{"hazardType":"<type>","confidence":<0.0-1.0>,"description":"<short description>"}`,
          },
        ],
      },
    ],
  })

  const contentBlock = response.content[0]
  if (contentBlock && contentBlock.type === 'text') {
    try {
      const data = JSON.parse(contentBlock.text.trim())
      return {
        hazardType: data.hazardType,
        confidence: data.confidence,
        description: data.description,
        fallbackUsed: false,
        model: 'claude-vision-byok',
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return { hazardType: null, confidence: 0 }
}

// ── Service Endpoints ──────────────────────────────────────────────────────────

/**
 * Calls the Python microservice or Ollama/Claude to classify report description text.
 */
export async function classifyReport(
  description: string,
  config?: AiConfig
): Promise<ClassifyResult> {
  const provider = config?.provider || 'server'

  if (provider === 'ollama') {
    return classifyWithOllama(config!, description)
  }
  if (provider === 'byok' && config?.apiKey) {
    return classifyWithClaude(config.apiKey, description)
  }

  // Default server route
  try {
    const response = await axios.post<ClassifyResult>(
      `${env.AI_SERVICE_URL}/classify`,
      { text: description },
      {
        headers: {
          'X-Service-Secret': env.AI_SERVICE_SECRET,
        },
        timeout: 5000,
      }
    )
    return response.data
  } catch (err) {
    console.warn('[aiClient] Default server classify failed, trying Ollama fallback...', err)
    try {
      const ollamaConfig: AiConfig = {
        provider: 'ollama',
        ollamaHost: 'http://localhost:11434',
        ollamaModel: 'qwen3:1.7b',
      }
      return await classifyWithOllama(ollamaConfig, description)
    } catch {
      throw err
    }
  }
}

/**
 * Calls the Python microservice or Claude BYOK to detect hazards from a photo URL.
 */
export async function detectHazard(photoUrl: string, config?: AiConfig): Promise<DetectResult> {
  const provider = config?.provider || 'server'

  if (provider === 'byok' && config?.apiKey) {
    try {
      return await detectWithClaudeBYOK(config.apiKey, photoUrl)
    } catch (err) {
      console.error('[aiClient] BYOK Claude Vision failed, falling back to server...', err)
    }
  }

  // Otherwise, default server (including for Ollama provider, which falls back to server's heuristic classifier)
  const response = await axios.post<DetectResult>(
    `${env.AI_SERVICE_URL}/detect`,
    { photoUrl },
    {
      headers: {
        'X-Service-Secret': env.AI_SERVICE_SECRET,
      },
      timeout: 15000,
    }
  )
  return response.data
}

/**
 * Summarizes safety conditions of a segment by calling Claude directly or Ollama.
 */
export async function getSegmentSummary(
  segment: SegmentDetail,
  config?: AiConfig
): Promise<string> {
  const provider = config?.provider || 'server'

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

  if (provider === 'ollama') {
    try {
      return await queryOllama(config!, SYSTEM_PROMPT, prompt)
    } catch (err) {
      console.error('[aiClient] Ollama summary failed:', err)
      return `Safety Score: ${segment.safetyScore} (${segment.safetyBand}). Lighting is ${segment.lightingScore}. Active reports: ${segment.activeReports}. (Ollama offline)`
    }
  }

  try {
    const client = getAnthropicClient(config || { provider: 'server' })
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const contentBlock = response.content[0]
    if (contentBlock && contentBlock.type === 'text') {
      return contentBlock.text
    }
  } catch (err) {
    console.warn('[aiClient] Claude summary failed, trying Ollama fallback...', err)
    try {
      const ollamaConfig: AiConfig = {
        provider: 'ollama',
        ollamaHost: 'http://localhost:11434',
        ollamaModel: 'qwen3:1.7b',
      }
      return await queryOllama(ollamaConfig, SYSTEM_PROMPT, prompt)
    } catch {
      return `The segment "${segment.name || 'Unnamed Street'}" has a safety score of ${segment.safetyScore} (${segment.safetyBand}). It has ${segment.activeReports} active citizen reports and lighting index of ${segment.lightingScore}.`
    }
  }
  throw new Error('Unexpected empty response from Claude API')
}

/**
 * Compares two routes and generates a comparison explanation by calling Claude directly or Ollama.
 */
export async function getRouteExplanation(
  fastest: RouteOption,
  safest: RouteOption,
  config?: AiConfig
): Promise<string> {
  const provider = config?.provider || 'server'

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

  if (provider === 'ollama') {
    try {
      return await queryOllama(config!, SYSTEM_PROMPT, prompt)
    } catch (err) {
      console.error('[aiClient] Ollama explanation failed:', err)
      return `Route 1 (Fastest) has safety score ${fastest.overallSafetyScore}. Route 2 (Safest) has safety score ${safest.overallSafetyScore} with fewer hazards. (Ollama offline)`
    }
  }

  try {
    const client = getAnthropicClient(config || { provider: 'server' })
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const contentBlock = response.content[0]
    if (contentBlock && contentBlock.type === 'text') {
      return contentBlock.text
    }
  } catch (err) {
    console.warn('[aiClient] Claude explanation failed, trying Ollama fallback...', err)
    try {
      const ollamaConfig: AiConfig = {
        provider: 'ollama',
        ollamaHost: 'http://localhost:11434',
        ollamaModel: 'qwen3:1.7b',
      }
      return await queryOllama(ollamaConfig, SYSTEM_PROMPT, prompt)
    } catch {
      return `The Safest route has a safety score of ${safest.overallSafetyScore} compared to the Fastest route's score of ${fastest.overallSafetyScore}. Safest route contains fewer hazardous red/amber segments.`
    }
  }
  throw new Error('Unexpected empty response from Claude API')
}

/**
 * Generates response for the floating chatbot grounded in local segment context.
 */
export async function getAssistantResponse(
  question: string,
  context: SegmentContext[],
  config?: AiConfig
): Promise<string> {
  const provider = config?.provider || 'server'

  const prompt = `User Question: "${question}"

Context on nearby road segments in Hyderabad:
${context
  .map(
    (seg, idx) =>
      `Segment ${idx + 1}: ${seg.name || 'Unnamed Street'} (Score: ${seg.safetyScore}, Band: ${seg.safetyBand}, Lighting: ${seg.lightingScore}, Flood Risk: ${seg.floodRisk}, Active Reports: ${seg.activeReports})`
  )
  .join('\n')}

Please answer the user's question based on the provided segment context. Keep the response factual and aligned with Hyderabad navigation and safety.`

  if (provider === 'ollama') {
    try {
      return await queryOllama(config!, SYSTEM_PROMPT, prompt)
    } catch (err) {
      console.error('[aiClient] Ollama assistant failed:', err)
      return `I'm sorry, I'm currently unable to process your request. (Ollama offline)`
    }
  }

  try {
    const client = getAnthropicClient(config || { provider: 'server' })
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const contentBlock = response.content[0]
    if (contentBlock && contentBlock.type === 'text') {
      return contentBlock.text
    }
  } catch (err) {
    console.warn('[aiClient] Claude assistant failed, trying Ollama fallback...', err)
    try {
      const ollamaConfig: AiConfig = {
        provider: 'ollama',
        ollamaHost: 'http://localhost:11434',
        ollamaModel: 'qwen3:1.7b',
      }
      return await queryOllama(ollamaConfig, SYSTEM_PROMPT, prompt)
    } catch {
      return `I am currently offline or unable to reach the AI service. Please configure local AI or check your connection.`
    }
  }
  throw new Error('Unexpected empty response from Claude API')
}
