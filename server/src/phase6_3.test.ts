import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
process.env.DATABASE_URL = 'postgresql://streetcheck:streetcheck_dev@localhost:5432/streetcheck'
const reportsRouter = (await import('./routes/reports.js')).default
import { prisma } from './db/prisma.js'
import { getNearestSegment } from './db/geoQueries.js'
import { recalculateSegmentScore } from './services/scoringEngine.js'

vi.mock('axios')
vi.mock('./db/prisma.js', () => ({
  prisma: {
    hazardReport: {
      create: vi.fn(),
    },
    roadSegment: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}))
vi.mock('./db/geoQueries.js', () => ({
  getNearestSegment: vi.fn(),
}))
vi.mock('./services/scoringEngine.js', () => ({
  recalculateSegmentScore: vi.fn(),
}))

describe('Phase 6.3 - POST /api/reports handler', () => {
  let handler: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Retrieve the actual POST route handler from the Express router
    const postLayer = reportsRouter.stack.find(
      (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
    ) as any
    if (!postLayer || !postLayer.route) {
      throw new Error('POST / route handler not found in reports router')
    }
    // The last handler in the route stack is the actual route function
    handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle
  })

  const mockRes = () => {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
  }

  it('applies CV override when confidence >= 0.8 and user did not override suggestion', async () => {
    // User submits pothole, which matches aiSuggestedType
    const req = {
      body: {
        reporterToken: '550e8400-e29b-41d4-a716-446655440000',
        lat: 17.4326,
        lng: 78.3862,
        hazardType: 'pothole',
        aiSuggestedType: 'pothole',
        photoUrl: 'https://example.com/photo.jpg',
      },
    } as any

    const res = mockRes()

    vi.mocked(getNearestSegment).mockResolvedValue({ id: 'seg_1' } as any)
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        hazardType: 'waterlogging',
        confidence: 0.85,
        description: 'Detected waterlogging',
      },
    })

    const mockReport = {
      id: 'rep_1',
      hazardType: 'waterlogging',
      severityWeight: 0.9,
      expiresAt: new Date(),
    }
    vi.mocked(prisma.hazardReport.create).mockResolvedValue(mockReport as any)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValue({
      id: 'seg_1',
      safetyScore: 0.75,
      safetyBand: 'green',
      activeReports: 1,
    } as any)

    await handler(req, res)

    // Verify axios called with snake_case key photo_url
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/detect'),
      { photo_url: 'https://example.com/photo.jpg' },
      expect.any(Object)
    )

    // Verify prisma.create was called with overwritten hazardType 'waterlogging'
    expect(prisma.hazardReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hazardType: 'waterlogging',
        cvHazardType: 'waterlogging',
        cvConfidence: 0.85,
      }),
    })

    // Verify segment score recalculation
    expect(recalculateSegmentScore).toHaveBeenCalledWith('seg_1')
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does NOT apply CV override when confidence < 0.8', async () => {
    // User submits pothole, matching aiSuggestedType
    const req = {
      body: {
        reporterToken: '550e8400-e29b-41d4-a716-446655440000',
        lat: 17.4326,
        lng: 78.3862,
        hazardType: 'pothole',
        aiSuggestedType: 'pothole',
        photoUrl: 'https://example.com/photo.jpg',
      },
    } as any

    const res = mockRes()

    vi.mocked(getNearestSegment).mockResolvedValue({ id: 'seg_1' } as any)
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        hazardType: 'waterlogging',
        confidence: 0.75, // low confidence
        description: 'Detected waterlogging',
      },
    })

    const mockReport = {
      id: 'rep_1',
      hazardType: 'pothole',
      severityWeight: 0.6,
      expiresAt: new Date(),
    }
    vi.mocked(prisma.hazardReport.create).mockResolvedValue(mockReport as any)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValue({
      id: 'seg_1',
      safetyScore: 0.75,
      safetyBand: 'green',
      activeReports: 1,
    } as any)

    await handler(req, res)

    // Verify prisma.create was called with original hazardType 'pothole'
    expect(prisma.hazardReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hazardType: 'pothole',
        cvHazardType: 'waterlogging',
        cvConfidence: 0.75,
      }),
    })

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does NOT apply CV override when user manually selected/overrode the suggestion', async () => {
    // User submitted 'pothole', but aiSuggestedType in frontend was 'stray_animals'
    // This indicates a manual override/selection
    const req = {
      body: {
        reporterToken: '550e8400-e29b-41d4-a716-446655440000',
        lat: 17.4326,
        lng: 78.3862,
        hazardType: 'pothole',
        aiSuggestedType: 'stray_animals',
        photoUrl: 'https://example.com/photo.jpg',
      },
    } as any

    const res = mockRes()

    vi.mocked(getNearestSegment).mockResolvedValue({ id: 'seg_1' } as any)
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        hazardType: 'waterlogging',
        confidence: 0.95,
        description: 'Detected waterlogging',
      },
    })

    const mockReport = {
      id: 'rep_1',
      hazardType: 'pothole',
      severityWeight: 0.6,
      expiresAt: new Date(),
    }
    vi.mocked(prisma.hazardReport.create).mockResolvedValue(mockReport as any)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValue({
      id: 'seg_1',
      safetyScore: 0.75,
      safetyBand: 'green',
      activeReports: 1,
    } as any)

    await handler(req, res)

    // Verify prisma.create was called with original hazardType 'pothole'
    expect(prisma.hazardReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hazardType: 'pothole',
        cvHazardType: 'waterlogging',
        cvConfidence: 0.95,
      }),
    })

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does NOT apply CV override when user did not have a suggestion (aiSuggestedType undefined)', async () => {
    // No aiSuggestedType provided (i.e. no AI prediction before submission)
    const req = {
      body: {
        reporterToken: '550e8400-e29b-41d4-a716-446655440000',
        lat: 17.4326,
        lng: 78.3862,
        hazardType: 'pothole',
        photoUrl: 'https://example.com/photo.jpg',
      },
    } as any

    const res = mockRes()

    vi.mocked(getNearestSegment).mockResolvedValue({ id: 'seg_1' } as any)
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        hazardType: 'waterlogging',
        confidence: 0.95,
        description: 'Detected waterlogging',
      },
    })

    const mockReport = {
      id: 'rep_1',
      hazardType: 'pothole',
      severityWeight: 0.6,
      expiresAt: new Date(),
    }
    vi.mocked(prisma.hazardReport.create).mockResolvedValue(mockReport as any)
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValue({
      id: 'seg_1',
      safetyScore: 0.75,
      safetyBand: 'green',
      activeReports: 1,
    } as any)

    await handler(req, res)

    // Verify prisma.create was called with original hazardType 'pothole'
    expect(prisma.hazardReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hazardType: 'pothole',
        cvHazardType: 'waterlogging',
        cvConfidence: 0.95,
      }),
    })

    expect(res.status).toHaveBeenCalledWith(201)
  })
})
