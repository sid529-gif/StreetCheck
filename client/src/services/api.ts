import axios from 'axios'
import type { FeatureCollection } from 'geojson'
import { useSessionStore } from '../store/sessionStore.js'
import {
  SubmitReportSchema,
  ReportResponseSchema,
  RouteRequestSchema,
  RouteResponseSchema,
} from '@streetcheck/shared'
import type {
  HazardType,
  SafetyBand,
  ReportResponse,
  RouteRequest,
  RouteResponse as RouteResult,
} from '@streetcheck/shared'

const client = axios.create({
  baseURL: '',
})

client.interceptors.request.use((config) => {
  const store = useSessionStore.getState()
  config.headers['x-ai-provider'] = store.aiProvider
  if (store.aiApiKey) {
    config.headers['x-ai-api-key'] = store.aiApiKey
  }
  config.headers['x-ollama-host'] = store.ollamaHost
  config.headers['x-ollama-model'] = store.ollamaModel
  return config
})

export interface BboxQuery {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
  band?: SafetyBand
}

export interface AppStats {
  segmentCount: number
  activeReports: number
  safetyIndex: number
  lastRefreshed: string
}

export interface SegmentReport {
  id: string
  segmentId: string
  hazardType: HazardType
  description?: string | undefined
  photoUrl?: string | undefined
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
  safetyBand: SafetyBand
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

export interface CreateReportInput {
  reporterToken: string
  lat: number
  lng: number
  hazardType: HazardType
  description?: string | undefined
  photoUrl?: string | undefined
  aiSuggestedType?: HazardType | null
}

export interface ReportPin {
  id: string
  lat: number
  lng: number
  hazardType: HazardType
  severityWeight: number
  segmentId: string
  createdAt: string
  expiresAt: string
}

export type { RouteResult }

export const api = {
  getSegments: async (bbox: BboxQuery): Promise<FeatureCollection> => {
    const bboxStr = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`
    const params: Record<string, string> = { bbox: bboxStr }
    if (bbox.band) {
      params['band'] = bbox.band
    }
    const { data } = await client.get<FeatureCollection>('/api/segments', { params })
    return data
  },

  getSegmentDetail: async (id: string): Promise<SegmentDetail> => {
    const { data } = await client.get<SegmentDetail>(`/api/segments/${id}`)
    return data
  },

  submitReport: async (input: CreateReportInput): Promise<ReportResponse> => {
    // Validate request schema before submitting
    const payload = SubmitReportSchema.parse({
      reporterToken: input.reporterToken,
      tapLocation: { lat: input.lat, lng: input.lng },
      hazardType: input.hazardType,
      confirmedType: input.hazardType,
      description: input.description,
      photoUrl: input.photoUrl,
      aiSuggestedType: input.aiSuggestedType,
    })

    const { data } = await client.post('/api/reports', {
      reporterToken: payload.reporterToken,
      lat: payload.tapLocation.lat,
      lng: payload.tapLocation.lng,
      hazardType: payload.hazardType,
      description: payload.description,
      photoUrl: payload.photoUrl,
      aiSuggestedType: payload.aiSuggestedType,
    })

    return ReportResponseSchema.parse(data)
  },

  detectPhoto: async (
    photoUrl: string
  ): Promise<{ suggestedType: HazardType | null; confidence: number }> => {
    const { data } = await client.post('/api/ai/detect-photo', { photoUrl })
    return data
  },

  classifyText: async (
    text: string
  ): Promise<{ suggestedType: HazardType | null; confidence: number }> => {
    const { data } = await client.post('/api/ai/classify-text', { text })
    return data
  },

  getReports: async (bbox: BboxQuery): Promise<ReportPin[]> => {
    const bboxStr = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`
    const { data } = await client.get<FeatureCollection>('/api/reports', {
      params: { bbox: bboxStr },
    })

    const features = data.features || []
    return features.map((f: any) => {
      const coords = f.geometry.coordinates as [number, number]
      const props = f.properties
      return {
        id: props.id || f.id,
        lat: coords[1],
        lng: coords[0],
        hazardType: props.hazardType,
        severityWeight: props.severityWeight,
        segmentId: props.segmentId,
        createdAt: props.createdAt,
        expiresAt: props.expiresAt,
      }
    })
  },

  computeRoutes: async (req: RouteRequest): Promise<RouteResult> => {
    // Validate request payload
    const payload = RouteRequestSchema.parse(req)
    const { data } = await client.post('/api/routes', payload)
    return RouteResponseSchema.parse(data)
  },

  getAiSummary: async (segmentId: string): Promise<string> => {
    try {
      const { data } = await client.post<{ summary: string }>('/api/ai/summary', { segmentId })
      return data.summary
    } catch (err: any) {
      if (err.response?.status === 501) {
        return 'AI Summary is offline. Complete Phase 5 to enable real-time segment intelligence.'
      }
      return 'Failed to load AI summary.'
    }
  },

  getRouteExplanation: async (
    fastestSegments: string[],
    safestSegments: string[]
  ): Promise<string> => {
    const token = useSessionStore.getState().anonymousToken
    const { data } = await client.post<{ explanation: string }>(
      '/api/ai/explanation',
      { fastestSegments, safestSegments },
      {
        headers: {
          'x-anonymous-token': token,
        },
      }
    )
    return data.explanation
  },

  getAssistantResponse: async (
    question: string,
    bbox?: [number, number, number, number]
  ): Promise<string> => {
    const token = useSessionStore.getState().anonymousToken
    const { data } = await client.post<{ answer: string }>(
      '/api/ai/assistant',
      { question, bbox },
      {
        headers: {
          'x-anonymous-token': token,
        },
      }
    )
    return data.answer
  },

  getStats: async (): Promise<AppStats> => {
    const { data } = await client.get<AppStats>('/api/stats')
    return data
  },
}
