process.env.DATABASE_URL = 'postgresql://streetcheck:streetcheck_dev@localhost:5432/streetcheck'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeSafetyScore, getSafetyBand } from '@streetcheck/shared'

// Mock prisma client
vi.mock('../db/prisma.js', () => ({
  prisma: {
    roadSegment: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../db/prisma.js'
import { recalculateSegmentScore, recalculateAllScores } from '../services/scoringEngine.js'

describe('computeSafetyScore', () => {
  it('returns 1.0 for perfect scores on all dimensions', () => {
    const score = computeSafetyScore({
      lightingScore: 1.0,
      floodRisk: 0.0,
      surfaceQuality: 1.0,
      walkabilityScore: 1.0,
      activeReports: 0,
    })
    expect(score).toBe(1.0)
  })

  it('returns 0.0 for worst scores on all dimensions', () => {
    const score = computeSafetyScore({
      lightingScore: 0.0,
      floodRisk: 1.0,
      surfaceQuality: 0.0,
      walkabilityScore: 0.0,
      activeReports: 5,
    })
    expect(score).toBe(0.0)
  })

  it('applies lighting weight of 0.30 correctly', () => {
    const score = computeSafetyScore({
      lightingScore: 1.0,
      floodRisk: 1.0,
      surfaceQuality: 0.0,
      walkabilityScore: 0.0,
      activeReports: 5,
    })
    expect(score).toBeCloseTo(0.3, 4)
  })

  it('applies flood weight of 0.25 correctly', () => {
    const score = computeSafetyScore({
      lightingScore: 0.0,
      floodRisk: 0.2, // floodScore = 0.8
      surfaceQuality: 0.0,
      walkabilityScore: 0.0,
      activeReports: 5,
    })
    expect(score).toBeCloseTo(0.2, 4)
  })

  it('clamps output to [0, 1] range', () => {
    const worst = computeSafetyScore({
      lightingScore: 0,
      floodRisk: 1,
      surfaceQuality: 0,
      walkabilityScore: 0,
      activeReports: 5,
    })
    const best = computeSafetyScore({
      lightingScore: 1,
      floodRisk: 0,
      surfaceQuality: 1,
      walkabilityScore: 1,
      activeReports: 0,
    })
    expect(worst).toBeGreaterThanOrEqual(0)
    expect(best).toBeLessThanOrEqual(1)
  })
})

describe('scoreToBand', () => {
  it('returns green for score >= 0.75', () => {
    expect(getSafetyBand(0.8)).toBe('green')
  })

  it('returns amber for score >= 0.45 and < 0.75', () => {
    expect(getSafetyBand(0.6)).toBe('amber')
  })

  it('returns red for score < 0.45', () => {
    expect(getSafetyBand(0.4)).toBe('red')
  })

  it('returns green for exact boundary 0.75', () => {
    expect(getSafetyBand(0.75)).toBe('green')
  })

  it('returns amber for exact boundary 0.45', () => {
    expect(getSafetyBand(0.45)).toBe('amber')
  })
})

describe('recalculateSegmentScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates safetyScore and safetyBand correctly with no active reports', async () => {
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce({
      lightingScore: 1.0,
      floodRisk: 0.0,
      surfaceQuality: 1.0,
      walkabilityScore: 1.0,
      activeReports: 0,
    } as any)

    await recalculateSegmentScore('seg1')

    expect(prisma.roadSegment.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'seg1' },
      select: expect.any(Object),
    })

    expect(prisma.roadSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg1' },
      data: {
        safetyScore: 1.0,
        safetyBand: 'green',
        scoringVersion: 2,
      },
    })
  })

  it('applies penalty for active reports and clamps to 0', async () => {
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce({
      lightingScore: 0.0,
      floodRisk: 1.0,
      surfaceQuality: 0.0,
      walkabilityScore: 0.0,
      activeReports: 5,
    } as any)

    await recalculateSegmentScore('seg2')

    expect(prisma.roadSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg2' },
      data: {
        safetyScore: 0,
        safetyBand: 'red',
        scoringVersion: 2,
      },
    })
  })
})

describe('recalculateAllScores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all segments and updates them in batches', async () => {
    vi.mocked(prisma.roadSegment.findMany).mockResolvedValueOnce([
      { id: 'seg1' },
      { id: 'seg2' },
    ] as any)

    vi.mocked(prisma.roadSegment.findUniqueOrThrow)
      .mockResolvedValueOnce({
        lightingScore: 1.0,
        accidentRate: 0.0,
        floodRisk: 0.0,
        surfaceQuality: 1.0,
        walkabilityScore: 1.0,
        activeReports: 0,
      } as any)
      .mockResolvedValueOnce({
        lightingScore: 0.0,
        accidentRate: 1.0,
        floodRisk: 1.0,
        surfaceQuality: 0.0,
        walkabilityScore: 0.0,
        activeReports: 0,
      } as any)

    await recalculateAllScores()

    expect(prisma.roadSegment.findMany).toHaveBeenCalled()
    expect(prisma.roadSegment.update).toHaveBeenCalledTimes(2)
  })
})
