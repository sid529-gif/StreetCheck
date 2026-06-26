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

// ── computeSafetyScore (new five-field schema) ────────────────────────────────

describe('computeSafetyScore', () => {
  it('returns 100 for perfect scores on all dimensions', () => {
    const score = computeSafetyScore({
      school: 100,
      hospital: 100,
      park: 100,
      bus_stop: 100,
      footpath: 100,
    })
    expect(score).toBe(100)
  })

  it('returns 0 for worst scores on all dimensions', () => {
    const score = computeSafetyScore({
      school: 0,
      hospital: 0,
      park: 0,
      bus_stop: 0,
      footpath: 0,
    })
    expect(score).toBe(0)
  })

  it('applies school weight of 0.25 correctly', () => {
    const score = computeSafetyScore({
      school: 100,
      hospital: 0,
      park: 0,
      bus_stop: 0,
      footpath: 0,
    })
    expect(score).toBeCloseTo(25, 0)
  })

  it('applies hospital weight of 0.25 correctly', () => {
    const score = computeSafetyScore({
      school: 0,
      hospital: 100,
      park: 0,
      bus_stop: 0,
      footpath: 0,
    })
    expect(score).toBeCloseTo(25, 0)
  })

  it('output stays in [0, 100] range', () => {
    const worst = computeSafetyScore({ school: 0, hospital: 0, park: 0, bus_stop: 0, footpath: 0 })
    const best = computeSafetyScore({
      school: 100,
      hospital: 100,
      park: 100,
      bus_stop: 100,
      footpath: 100,
    })
    expect(worst).toBeGreaterThanOrEqual(0)
    expect(best).toBeLessThanOrEqual(100)
  })
})

// ── getSafetyBand (updated thresholds: green > 75, amber > 45) ────────────────

describe('getSafetyBand', () => {
  it('returns green for score > 75', () => {
    expect(getSafetyBand(80)).toBe('green')
  })

  it('returns amber for score > 45 and ≤ 75', () => {
    expect(getSafetyBand(60)).toBe('amber')
  })

  it('returns red for score ≤ 45', () => {
    expect(getSafetyBand(40)).toBe('red')
  })

  it('returns amber for exact boundary 75', () => {
    expect(getSafetyBand(75)).toBe('amber')
  })

  it('returns red for exact boundary 45', () => {
    expect(getSafetyBand(45)).toBe('red')
  })
})

// ── recalculateSegmentScore ───────────────────────────────────────────────────

describe('recalculateSegmentScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates safetyScore and safetyBand correctly with full proximity scores', async () => {
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce({
      school: 100,
      hospital: 100,
      park: 100,
      bus_stop: 100,
      footpath: 100,
    } as any)

    await recalculateSegmentScore('seg1')

    expect(prisma.roadSegment.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'seg1' },
      select: expect.any(Object),
    })

    expect(prisma.roadSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg1' },
      data: {
        safetyScore: 100,
        safetyBand: 'green',
        scoringVersion: 3,
      },
    })
  })

  it('correctly bands a zero-proximity segment as red', async () => {
    vi.mocked(prisma.roadSegment.findUniqueOrThrow).mockResolvedValueOnce({
      school: 0,
      hospital: 0,
      park: 0,
      bus_stop: 0,
      footpath: 0,
    } as any)

    await recalculateSegmentScore('seg2')

    expect(prisma.roadSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg2' },
      data: {
        safetyScore: 0,
        safetyBand: 'red',
        scoringVersion: 3,
      },
    })
  })
})

// ── recalculateAllScores ──────────────────────────────────────────────────────

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
        school: 90,
        hospital: 90,
        park: 85,
        bus_stop: 90,
        footpath: 85,
      } as any)
      .mockResolvedValueOnce({
        school: 10,
        hospital: 10,
        park: 10,
        bus_stop: 10,
        footpath: 10,
      } as any)

    await recalculateAllScores()

    expect(prisma.roadSegment.findMany).toHaveBeenCalled()
    expect(prisma.roadSegment.update).toHaveBeenCalledTimes(2)
  })
})
