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
  it('returns 100 for a perfect segment', () => {
    const score = computeSafetyScore({
      school: 100,
      hospital: 100,
      park: 100,
      bus_stop: 100,
      footpath: 100,
    })
    expect(score).toBe(100)
  })

  it('returns 0 for the worst-case segment', () => {
    const score = computeSafetyScore({
      school: 0,
      hospital: 0,
      park: 0,
      bus_stop: 0,
      footpath: 0,
    })
    expect(score).toBe(0)
  })

  it('matches the locked formula for a known input', () => {
    // school=80, hospital=80, park=80, bus_stop=80, footpath=80
    // = 0.25*80 + 0.25*80 + 0.20*80 + 0.15*80 + 0.15*80
    // = 20 + 20 + 16 + 12 + 12 = 80
    const score = computeSafetyScore({
      school: 80,
      hospital: 80,
      park: 80,
      bus_stop: 80,
      footpath: 80,
    })
    expect(score).toBeCloseTo(80, 0)
  })

  it('uses the WEIGHTS constants from shared package — sum equals 1.0', () => {
    const sum =
      WEIGHTS.school + WEIGHTS.hospital + WEIGHTS.park + WEIGHTS.bus_stop + WEIGHTS.footpath
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('produces mid-range score for uniform 50% inputs', () => {
    const score = computeSafetyScore({
      school: 50,
      hospital: 50,
      park: 50,
      bus_stop: 50,
      footpath: 50,
    })
    expect(score).toBeCloseTo(50, 0)
  })
})

// ── getSafetyBand ─────────────────────────────────────────────────────────────

describe('getSafetyBand', () => {
  it('returns "amber" at exactly 75 (boundary exclusive)', () => {
    expect(getSafetyBand(75)).toBe('amber')
  })

  it('returns "green" above 75', () => {
    expect(getSafetyBand(80)).toBe('green')
    expect(getSafetyBand(100)).toBe('green')
  })

  it('returns "amber" just below 76', () => {
    expect(getSafetyBand(75.9)).toBe('amber')
  })

  it('returns "red" at exactly 45 (boundary exclusive)', () => {
    expect(getSafetyBand(45)).toBe('red')
  })

  it('returns "amber" between 46 and 75', () => {
    expect(getSafetyBand(60)).toBe('amber')
  })

  it('returns "red" just below 46', () => {
    expect(getSafetyBand(44)).toBe('red')
  })

  it('returns "red" at 0', () => {
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
