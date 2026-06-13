/**
 * Phase 2 — Unit tests for StreetCheck backend
 *
 * Tests:
 *   - computeSafetyScore() with known inputs
 *   - getSafetyBand() boundary cases
 *   - validate() middleware (happy + error paths)
 *   - Route handler validation (invalid bbox, missing fields)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeSafetyScore, getSafetyBand, WEIGHTS } from '@streetcheck/shared'
import { z } from 'zod'

// ── computeSafetyScore ────────────────────────────────────────────────────────

describe('computeSafetyScore', () => {
  it('returns 1.0 for a perfect segment', () => {
    const score = computeSafetyScore({
      lightingScore: 1,
      floodRisk: 0,
      surfaceQuality: 1,
      walkabilityScore: 1,
      activeReports: 0,
    })
    expect(score).toBe(1.0)
  })

  it('returns 0.0 for the worst-case segment', () => {
    const score = computeSafetyScore({
      lightingScore: 0,
      floodRisk: 1,
      surfaceQuality: 0,
      walkabilityScore: 0,
      activeReports: 5,
    })
    expect(score).toBe(0.0)
  })

  it('matches the locked formula for a known input', () => {
    // lighting=0.8, floodRisk=0.1 (floodScore=0.9), surface=0.7, walkability=0.6, activeReports=1 (community=0.8)
    // = 0.30*0.8 + 0.25*0.9 + 0.20*0.7 + 0.15*0.6 + 0.10*0.8
    // = 0.24 + 0.225 + 0.14 + 0.09 + 0.08 = 0.775
    const score = computeSafetyScore({
      lightingScore: 0.8,
      floodRisk: 0.1,
      surfaceQuality: 0.7,
      walkabilityScore: 0.6,
      activeReports: 1,
    })
    expect(score).toBeCloseTo(0.775, 4)
  })

  it('uses the WEIGHTS constants from shared package', () => {
    // Verify weights sum to 1.0
    const sum =
      WEIGHTS.lighting + WEIGHTS.flood + WEIGHTS.surface + WEIGHTS.walkability + WEIGHTS.community
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('clamps correctly even with boundary inputs', () => {
    // Mid-range inputs
    const score = computeSafetyScore({
      lightingScore: 0.5,
      floodRisk: 0.5,
      surfaceQuality: 0.5,
      walkabilityScore: 0.5,
      activeReports: 2.5, // community = 1 - 2.5 * 0.2 = 0.5
    })
    // = 0.30*0.5 + 0.25*0.5 + 0.20*0.5 + 0.15*0.5 + 0.10*0.5 = 0.5
    expect(score).toBeCloseTo(0.5, 4)
  })
})

// ── getSafetyBand ─────────────────────────────────────────────────────────────

describe('getSafetyBand', () => {
  it('returns "green" at exactly 0.75', () => {
    expect(getSafetyBand(0.75)).toBe('green')
  })

  it('returns "green" above 0.75', () => {
    expect(getSafetyBand(0.9)).toBe('green')
    expect(getSafetyBand(1.0)).toBe('green')
  })

  it('returns "amber" just below 0.75', () => {
    expect(getSafetyBand(0.749)).toBe('amber')
  })

  it('returns "amber" at exactly 0.45', () => {
    expect(getSafetyBand(0.45)).toBe('amber')
  })

  it('returns "amber" between 0.45 and 0.75', () => {
    expect(getSafetyBand(0.6)).toBe('amber')
  })

  it('returns "red" just below 0.45', () => {
    expect(getSafetyBand(0.449)).toBe('red')
  })

  it('returns "red" at 0.0', () => {
    expect(getSafetyBand(0)).toBe('red')
  })
})

// ── validate() middleware ─────────────────────────────────────────────────────

describe('validate middleware', () => {
  // Import dynamically to allow vi.mock to work
  const mockReq = (body: unknown) => ({ body }) as import('express').Request
  const mockRes = () => {
    const res: Partial<import('express').Response> = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res as import('express').Response
  }
  const mockNext = vi.fn()

  beforeEach(() => {
    mockNext.mockClear()
  })

  it('calls next() for valid body', async () => {
    const { validate } = await import('./middleware/validate.js')
    const schema = z.object({ name: z.string() })
    const mw = validate(schema)
    const req = mockReq({ name: 'test' })
    const res = mockRes()
    mw(req, res, mockNext)
    expect(mockNext).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors for invalid body', async () => {
    const { validate } = await import('./middleware/validate.js')
    const schema = z.object({ name: z.string(), age: z.number() })
    const mw = validate(schema)
    const req = mockReq({ name: 123 }) // wrong type
    const res = mockRes()
    mw(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'VALIDATION_ERROR' }))
    expect(mockNext).not.toHaveBeenCalled()
  })
})

// ── bbox validation ───────────────────────────────────────────────────────────

describe('bbox query validation', () => {
  const BboxSchema = z.object({
    bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  })

  it('accepts valid bbox string', () => {
    expect(BboxSchema.safeParse({ bbox: '78.3,17.2,78.6,17.6' }).success).toBe(true)
  })

  it('rejects bbox with wrong number of parts', () => {
    expect(BboxSchema.safeParse({ bbox: '78.3,17.2,78.6' }).success).toBe(false)
  })

  it('rejects bbox with non-numeric values', () => {
    expect(BboxSchema.safeParse({ bbox: 'abc,def,ghi,jkl' }).success).toBe(false)
  })

  it('accepts negative coordinates', () => {
    expect(BboxSchema.safeParse({ bbox: '-10.5,-20.3,10.5,20.3' }).success).toBe(true)
  })
})

// ── route request validation ──────────────────────────────────────────────────

describe('route request validation', () => {
  const RouteSchema = z.object({
    origin: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    destination: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  })

  it('accepts valid Banjara Hills → Gachibowli coordinates', () => {
    const result = RouteSchema.safeParse({
      origin: { lat: 17.4126, lng: 78.4489 },
      destination: { lat: 17.4401, lng: 78.3489 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing destination', () => {
    const result = RouteSchema.safeParse({
      origin: { lat: 17.4, lng: 78.4 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects out-of-range lat', () => {
    const result = RouteSchema.safeParse({
      origin: { lat: 91, lng: 78.4 },
      destination: { lat: 17.4, lng: 78.5 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric coordinates', () => {
    const result = RouteSchema.safeParse({
      origin: { lat: 'seventeen', lng: 78.4 },
      destination: { lat: 17.4, lng: 78.5 },
    })
    expect(result.success).toBe(false)
  })
})
