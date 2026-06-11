import type { RoadSegment } from '@prisma/client'
import { prisma } from './prisma.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

// ── Bbox query ────────────────────────────────────────────────────────────────

/**
 * Returns all road segments whose stored bbox overlaps the given viewport bbox.
 * bbox is stored as a Json column { minLng, minLat, maxLng, maxLat }.
 *
 * Overlap condition (AABB intersection):
 *   seg.minLng <= viewport.maxLng AND seg.maxLng >= viewport.minLng
 *   seg.minLat <= viewport.maxLat AND seg.maxLat >= viewport.minLat
 */
export async function getSegmentsByBbox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): Promise<RoadSegment[]> {
  // Use raw SQL to query JSON bbox fields efficiently
  const rows = await prisma.$queryRaw<RoadSegment[]>`
    SELECT *
    FROM road_segments
    WHERE
      (bbox->>'minLng')::float <= ${maxLng}
      AND (bbox->>'maxLng')::float >= ${minLng}
      AND (bbox->>'minLat')::float <= ${maxLat}
      AND (bbox->>'maxLat')::float >= ${minLat}
    ORDER BY safety_score ASC
    LIMIT 2000
  `
  return rows
}

// ── Nearest segment ───────────────────────────────────────────────────────────

/**
 * Returns the road segment whose bbox centroid is closest to the given point.
 * Used for snapping hazard reports to the nearest road.
 */
export async function getNearestSegment(lat: number, lng: number): Promise<RoadSegment | null> {
  const rows = await prisma.$queryRaw<RoadSegment[]>`
    SELECT *,
      (
        ((bbox->>'minLng')::float + (bbox->>'maxLng')::float) / 2.0 - ${lng}
      ) ^ 2
      +
      (
        ((bbox->>'minLat')::float + (bbox->>'maxLat')::float) / 2.0 - ${lat}
      ) ^ 2
      AS dist_sq
    FROM road_segments
    WHERE
      (bbox->>'minLng')::float BETWEEN ${lng - 0.05} AND ${lng + 0.05}
      AND (bbox->>'minLat')::float BETWEEN ${lat - 0.05} AND ${lat + 0.05}
    ORDER BY dist_sq ASC
    LIMIT 1
  `
  return rows[0] ?? null
}

// ── Segment count ─────────────────────────────────────────────────────────────

export async function getSegmentCount(): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM road_segments
  `
  return Number(result[0]?.count ?? 0)
}

// ── Compute bbox from GeoJSON LineString ──────────────────────────────────────

export function computeBbox(coordinates: [number, number][]): Bbox {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }

  return { minLng, minLat, maxLng, maxLat }
}
