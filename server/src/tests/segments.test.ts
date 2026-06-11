process.env.DATABASE_URL = 'postgresql://streetcheck:streetcheck_dev@localhost:5432/streetcheck'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import segmentsRouter from '../routes/segments.js'

// Mock prisma client
vi.mock('../db/prisma.js', () => ({
  prisma: {
    roadSegment: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock geoQueries
vi.mock('../db/geoQueries.js', () => ({
  getSegmentsByBbox: vi.fn(),
}))

import { prisma } from '../db/prisma.js'
import { getSegmentsByBbox } from '../db/geoQueries.js'

// Helper to extract the GET '/' handler chain
const getSegmentsHandlerChain = () => {
  const layer = segmentsRouter.stack.find(
    (s) => (s as any).route?.path === '/' && (s as any).route?.methods?.get
  )
  if (!layer || !layer.route) throw new Error('GET / route not found')
  return layer.route.stack.map((s: any) => s.handle)
}

// Helper to extract GET '/:id' handler chain
const getSegmentByIdHandlerChain = () => {
  const layer = segmentsRouter.stack.find(
    (s) => (s as any).route?.path === '/:id' && (s as any).route?.methods?.get
  )
  if (!layer || !layer.route) throw new Error('GET /:id route not found')
  return layer.route.stack.map((s: any) => s.handle)
}

describe('GET /api/segments', () => {
  let handlers: any[]
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: any
  let jsonMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = getSegmentsHandlerChain()
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

  // Run a request through the Express handlers chain
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

  it('returns 400 for missing bbox parameter', async () => {
    req.query = {}
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
    expect((res as any).body).toEqual(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
      })
    )
  })

  it('returns 400 for malformed bbox (non-numeric)', async () => {
    req.query = { bbox: 'abc,def,ghi,jkl' }
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for bbox with wrong number of values', async () => {
    req.query = { bbox: '78.3,17.2,78.6' }
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns GeoJSON FeatureCollection for valid bbox', async () => {
    req.query = { bbox: '78.3,17.2,78.6,17.6' }
    const mockSegments = [
      {
        id: 'seg1',
        osmWayId: 12345n,
        name: 'Road 1',
        geometry: {
          type: 'LineString',
          coordinates: [
            [78.3, 17.2],
            [78.4, 17.3],
          ],
        },
        bbox: {},
        safetyScore: 0.8,
        safetyBand: 'green',
        activeReports: 0,
        osmHighway: 'primary',
        osmLit: 'yes',
        osmSurface: 'asphalt',
        osmFootway: null,
        osmSidewalk: null,
        lightingScore: 0.8,
        accidentRate: 0.1,
        floodRisk: 0.1,
        surfaceQuality: 0.8,
        walkabilityScore: 0.8,
      },
    ]
    vi.mocked(getSegmentsByBbox).mockResolvedValueOnce(mockSegments as any)

    await runRoute()

    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(getSegmentsByBbox).toHaveBeenCalledWith(78.3, 17.2, 78.6, 17.6)
    expect((res as any).body).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'seg1',
          geometry: {
            type: 'LineString',
            coordinates: [
              [78.3, 17.2],
              [78.4, 17.3],
            ],
          },
          properties: expect.objectContaining({
            id: 'seg1',
            safetyScore: 0.8,
            safetyBand: 'green',
            name: 'Road 1',
          }),
        },
      ],
      meta: {
        total: 1,
        returned: 1,
        capped: false,
      },
    })
  })

  it('caps response at 500 features', async () => {
    req.query = { bbox: '78.3,17.2,78.6,17.6' }
    const mockSegments = Array.from({ length: 600 }, (_, i) => ({
      id: `seg${i}`,
      osmWayId: BigInt(i),
      name: `Road ${i}`,
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.3, 17.2],
          [78.4, 17.3],
        ],
      },
      bbox: {},
      safetyScore: 0.5,
      safetyBand: 'amber',
      activeReports: 0,
      osmHighway: 'residential',
      osmLit: null,
      osmSurface: null,
      osmFootway: null,
      osmSidewalk: null,
      lightingScore: 0.5,
      accidentRate: 0.1,
      floodRisk: 0.1,
      surfaceQuality: 0.5,
      walkabilityScore: 0.5,
    }))
    vi.mocked(getSegmentsByBbox).mockResolvedValueOnce(mockSegments as any)

    await runRoute()

    expect((res as any).body.features.length).toBe(500)
    expect((res as any).body.meta.total).toBe(600)
    expect((res as any).body.meta.returned).toBe(500)
    expect((res as any).body.meta.capped).toBe(true)
  })
})

describe('GET /api/segments/:id', () => {
  let handlers: any[]
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: any
  let jsonMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = getSegmentByIdHandlerChain()
    req = {
      params: { id: 'seg-123' },
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

  it('returns 404 if segment is not found', async () => {
    vi.mocked(prisma.roadSegment.findUnique).mockResolvedValueOnce(null)
    await runRoute()
    expect(res.status).toHaveBeenCalledWith(404)
    expect((res as any).body.error).toBe('SEGMENT_NOT_FOUND')
  })

  it('returns segment details if found', async () => {
    const mockSegment = {
      id: 'seg-123',
      osmWayId: 10001n,
      name: 'Test Road',
      geometry: { type: 'LineString', coordinates: [] },
      bbox: {},
      lightingScore: 0.8,
      accidentRate: 0.1,
      floodRisk: 0.2,
      surfaceQuality: 0.7,
      walkabilityScore: 0.9,
      safetyScore: 0.75,
      safetyBand: 'green',
      scoringVersion: 1,
      osmHighway: 'primary',
      osmLit: 'yes',
      osmSurface: 'asphalt',
      osmFootway: null,
      osmSidewalk: null,
      activeReports: 0,
      reports: [],
      updatedAt: new Date(),
      lastOsmSync: new Date(),
      createdAt: new Date(),
    }
    vi.mocked(prisma.roadSegment.findUnique).mockResolvedValueOnce(mockSegment as any)

    await runRoute()

    expect(res.status).not.toHaveBeenCalledWith(404)
    expect(prisma.roadSegment.findUnique).toHaveBeenCalledWith({
      where: { id: 'seg-123' },
      include: expect.any(Object),
    })
    expect((res as any).body).toEqual(
      expect.objectContaining({
        id: 'seg-123',
        osmWayId: '10001',
        name: 'Test Road',
        safetyScore: 0.75,
        safetyBand: 'green',
      })
    )
  })
})
