process.env.DATABASE_URL = 'postgresql://streetcheck:streetcheck_dev@localhost:5432/streetcheck'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import axios from 'axios'

// Mock prisma client
vi.mock('../db/prisma.js', () => ({
  prisma: {
    hazardReport: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    roadSegment: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}))

// Mock geoQueries
vi.mock('../db/geoQueries.js', () => ({
  getNearestSegment: vi.fn(),
}))

// Mock scoringEngine
vi.mock('../services/scoringEngine.js', () => ({
  recalculateSegmentScore: vi.fn(),
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

import { prisma } from '../db/prisma.js'
import { getNearestSegment } from '../db/geoQueries.js'
import { recalculateSegmentScore } from '../services/scoringEngine.js'

const { default: reportsRouter } = await import('../routes/reports.js')

// Helper to extract POST '/' handler chain
const getCreateReportHandlerChain = () => {
  const layer = reportsRouter.stack.find(
    (s) => (s as any).route?.path === '/' && (s as any).route?.methods?.post
  )
  if (!layer || !layer.route) throw new Error('POST / route not found')
  return layer.route.stack.map((s: any) => s.handle)
}

describe('POST /api/reports', () => {
  let handlers: any[]
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: any
  let jsonMock: any

  const mockReport = {
    id: 'rep-456',
    anonymousToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
    segmentId: 'seg-123',
    hazardType: 'pothole',
    severityWeight: 0.6,
    expiresAt: new Date(),
  }

  const mockUpdatedSegment = {
    id: 'seg-123',
    safetyScore: 0.74,
    safetyBand: 'amber',
    activeReports: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = getCreateReportHandlerChain()
    req = {
      body: {},
    }
    statusMock = vi.fn().mockImplementation((code) => {
      res.statusCode = code
      return res
    })
    jsonMock = vi.fn().mockImplementation((data) => {
      ;(res as any).body = data
      return res
    })
    res = {
      status: statusMock,
      json: jsonMock,
      statusCode: 200,
      body: null,
    } as any
  })

  const runRoute = async () => {
    for (const handler of handlers) {
      let isNextCalled = false
      const nextWrapper = (err?: any) => {
        isNextCalled = true
        if (err) throw err
      }
      await handler(req as Request, res as Response, nextWrapper)
      if (!isNextCalled && (res.statusCode !== 200 || (res as any).body)) {
        break
      }
    }
  }

  it('returns 400 for missing required fields', async () => {
    req.body = {}
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
    expect((res as any).body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid hazardType value', async () => {
    req.body = {
      reporterToken: '00000000-0000-0000-0000-000000000000',
      lat: 17.4,
      lng: 78.4,
      hazardType: 'invalid_hazard_type',
    }
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for coordinates outside Hyderabad bbox', async () => {
    req.body = {
      reporterToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      lat: 20.0,
      lng: 78.41,
      hazardType: 'pothole',
    }
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 422 when no road segment is found nearby', async () => {
    req.body = {
      reporterToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      lat: 17.43,
      lng: 78.41,
      hazardType: 'pothole',
    }

    vi.mocked(getNearestSegment).mockResolvedValueOnce(null)

    await runRoute()
    expect(res.status).toHaveBeenCalledWith(422)
    expect((res as any).body.error).toBe('NO_SEGMENT_NEARBY')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    const token = '11111111-2222-3333-4444-555555555555'
    req.body = {
      reporterToken: token,
      lat: 17.43,
      lng: 78.41,
      hazardType: 'pothole',
    }

    vi.mocked(getNearestSegment).mockResolvedValue({ id: 'seg-123' } as any)
    vi.mocked(prisma.hazardReport.create).mockResolvedValue(mockReport as any)
    vi.mocked(recalculateSegmentScore).mockResolvedValue(undefined)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValue(mockUpdatedSegment as any)

    for (let i = 0; i < 5; i++) {
      res.statusCode = 200
      await runRoute()
      expect(res.status).not.toHaveBeenCalledWith(429)
    }

    res.statusCode = 200
    vi.mocked(res.status).mockClear()
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('creates report and returns updated segment score', async () => {
    req.body = {
      reporterToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      lat: 17.43,
      lng: 78.41,
      hazardType: 'pothole',
      description: 'Big pothole',
    }

    const mockSegment = {
      id: 'seg-123',
      osmWayId: 10001n,
      name: 'Test Road',
    }

    vi.mocked(getNearestSegment).mockResolvedValueOnce(mockSegment as any)
    vi.mocked(prisma.hazardReport.create).mockResolvedValueOnce(mockReport as any)
    vi.mocked(prisma.roadSegment.update).mockResolvedValueOnce(mockSegment as any)
    vi.mocked(recalculateSegmentScore).mockResolvedValueOnce(undefined)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce(mockUpdatedSegment as any)

    await runRoute()

    expect(res.status).toHaveBeenCalledWith(201)
    expect(getNearestSegment).toHaveBeenCalledWith(17.43, 78.41)
    expect(prisma.hazardReport.create).toHaveBeenCalled()
    expect(recalculateSegmentScore).toHaveBeenCalledWith('seg-123')
    expect((res as any).body).toEqual(
      expect.objectContaining({
        reportId: 'rep-456',
        segmentId: 'seg-123',
        hazardType: 'pothole',
        updatedSegment: expect.objectContaining({
          segmentId: 'seg-123',
          safetyScore: 0.74,
          safetyBand: 'amber',
        }),
      })
    )
  })

  it('integrates optional NLP and CV AI classifications and handles manual suggest', async () => {
    req.body = {
      reporterToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      lat: 17.43,
      lng: 78.41,
      hazardType: 'pothole',
      description: 'Dangerous pothole',
      photoUrl: 'http://example.com/pothole.jpg',
      aiSuggestedType: 'pothole',
    }

    vi.mocked(getNearestSegment).mockResolvedValueOnce({ id: 'seg-123' } as any)
    vi.mocked(prisma.hazardReport.create).mockResolvedValueOnce(mockReport as any)
    vi.mocked(recalculateSegmentScore).mockResolvedValueOnce(undefined)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce(mockUpdatedSegment as any)

    vi.mocked(axios.post)
      .mockResolvedValueOnce({
        data: { hazardType: 'pothole', confidence: 0.95 },
      })
      .mockResolvedValueOnce({
        data: { hazardType: 'pothole', confidence: 0.92 },
      })

    await runRoute()

    expect(axios.post).toHaveBeenCalledTimes(2)
  })

  it('handles optional AI service failures gracefully', async () => {
    req.body = {
      reporterToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      lat: 17.43,
      lng: 78.41,
      hazardType: 'pothole',
      description: 'Dangerous pothole',
      photoUrl: 'http://example.com/pothole.jpg',
    }

    vi.mocked(getNearestSegment).mockResolvedValueOnce({ id: 'seg-123' } as any)
    vi.mocked(prisma.hazardReport.create).mockResolvedValueOnce(mockReport as any)
    vi.mocked(recalculateSegmentScore).mockResolvedValueOnce(undefined)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce(mockUpdatedSegment as any)

    vi.mocked(axios.post).mockRejectedValue(new Error('AI Service Down'))

    await runRoute()

    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('GET /api/reports', () => {
  let handlers: any[]
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: any
  let jsonMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    const layer = reportsRouter.stack.find(
      (s) => (s as any).route?.path === '/' && (s as any).route?.methods?.get
    )
    if (!layer || !layer.route) throw new Error('GET / route not found')
    handlers = layer.route.stack.map((s: any) => s.handle)

    req = {
      query: {},
    }
    statusMock = vi.fn().mockImplementation((code) => {
      res.statusCode = code
      return res
    })
    jsonMock = vi.fn().mockImplementation((data) => {
      ;(res as any).body = data
      return res
    })
    res = {
      status: statusMock,
      json: jsonMock,
      statusCode: 200,
      body: null,
    } as any
  })

  const runRoute = async () => {
    for (const handler of handlers) {
      let isNextCalled = false
      const nextWrapper = (err?: any) => {
        isNextCalled = true
        if (err) throw err
      }
      await handler(req as Request, res as Response, nextWrapper)
      if (!isNextCalled && (res.statusCode !== 200 || (res as any).body)) {
        break
      }
    }
  }

  it('returns 400 for missing bbox query', async () => {
    req.query = {}
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns feature collection with reports in bounding box', async () => {
    req.query = { bbox: '78.3,17.2,78.6,17.6' }

    const mockReports = [
      {
        id: 'rep-1',
        lat: 17.3,
        lng: 78.4,
        hazardType: 'pothole',
        severityWeight: 0.6,
        segmentId: 'seg-1',
        createdAt: new Date('2026-06-11T12:00:00Z'),
        expiresAt: new Date('2026-06-11T22:00:00Z'),
      },
    ]

    vi.mocked(prisma.hazardReport.findMany).mockResolvedValueOnce(mockReports as any)

    await runRoute()

    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(prisma.hazardReport.findMany).toHaveBeenCalled()
    expect((res as any).body).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'rep-1',
          geometry: { type: 'Point', coordinates: [78.4, 17.3] },
          properties: {
            id: 'rep-1',
            hazardType: 'pothole',
            severityWeight: 0.6,
            segmentId: 'seg-1',
            createdAt: '2026-06-11T12:00:00.000Z',
            expiresAt: '2026-06-11T22:00:00.000Z',
          },
        },
      ],
      meta: { count: 1 },
    })
  })

  it('handles optional hazardType query parameter', async () => {
    req.query = { bbox: '78.3,17.2,78.6,17.6', hazardType: 'pothole' }
    vi.mocked(prisma.hazardReport.findMany).mockResolvedValueOnce([])

    await runRoute()

    expect(prisma.hazardReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hazardType: 'pothole',
        }),
      })
    )
  })
})
