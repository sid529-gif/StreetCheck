/**
 * StreetCheck — Overpass API seed script
 *
 * Fetches all road ways in Hyderabad from Overpass API and upserts
 * them into the road_segments table with initial safety scores.
 *
 * Run: npm run seed:overpass
 * Target: ≥ 5,000 segments for the Hyderabad demo bbox
 */

import axios from 'axios'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { computeSafetyScore, getSafetyBand, SCORING_VERSION } from '@streetcheck/shared'
import { computeBbox } from '../db/geoQueries.js'

dotenv.config()

const prisma = new PrismaClient()

// ── Configuration ────────────────────────────────────────────────────────────

const FULL_CITY = process.env['OVERPASS_FULL_CITY'] === 'true'
const OVERPASS_URL = process.env['OVERPASS_API_URL'] ?? 'https://overpass-api.de/api/interpreter'

// Bounding boxes: south,west,north,east
const BBOX_DEMO = '17.32,78.38,17.50,78.55' // Kondapur–Banjara Hills–Gachibowli
const BBOX_FULL = '17.20,78.30,17.60,78.60' // Full Hyderabad urban area
const BBOX = FULL_CITY ? BBOX_FULL : BBOX_DEMO

const BATCH_SIZE = 200 // DB upsert batch size

// ── OSM tag → score heuristics ────────────────────────────────────────────────

function lightingFromOsm(lit: string | undefined): number {
  const map: Record<string, number> = {
    yes: 0.9,
    '24/7': 1.0,
    automatic: 0.85,
    no: 0.1,
    disused: 0.1,
  }
  return map[lit ?? ''] ?? 0.5
}

function surfaceFromOsm(surface: string | undefined): number {
  const map: Record<string, number> = {
    asphalt: 0.9,
    paved: 0.85,
    concrete: 0.85,
    'concrete:plates': 0.8,
    'concrete:lanes': 0.8,
    paving_stones: 0.75,
    cobblestone: 0.6,
    sett: 0.6,
    compacted: 0.55,
    gravel: 0.4,
    fine_gravel: 0.45,
    unpaved: 0.3,
    dirt: 0.2,
    mud: 0.1,
    sand: 0.2,
    ground: 0.35,
    grass: 0.3,
  }
  return map[surface ?? ''] ?? 0.6
}

function walkabilityFromOsm(footway: string | undefined, sidewalk: string | undefined): number {
  const hasSidewalk = sidewalk && ['yes', 'both', 'left', 'right'].includes(sidewalk)
  const hasFootway = footway === 'yes'
  const noWalk = footway === 'no' && (!sidewalk || sidewalk === 'no')
  if (hasSidewalk || hasFootway) return 0.9
  if (noWalk) return 0.2
  return 0.5
}

// Highway type affects accident rate heuristic
function accidentRateFromHighway(highway: string | undefined): number {
  const map: Record<string, number> = {
    motorway: 0.3,
    trunk: 0.25,
    primary: 0.2,
    secondary: 0.15,
    tertiary: 0.12,
    unclassified: 0.1,
    residential: 0.08,
    service: 0.06,
    living_street: 0.04,
    pedestrian: 0.03,
    footway: 0.02,
    cycleway: 0.05,
    path: 0.06,
  }
  return map[highway ?? ''] ?? 0.1
}

// ── Overpass API types ────────────────────────────────────────────────────────

interface OverpassNode {
  type: 'node'
  id: number
  lat: number
  lon: number
}

interface OverpassWay {
  type: 'way'
  id: number
  nodes: number[]
  tags?: {
    name?: string
    highway?: string
    lit?: string
    surface?: string
    footway?: string
    sidewalk?: string
    [key: string]: string | undefined
  }
}

interface OverpassResponse {
  elements: (OverpassNode | OverpassWay)[]
}

// ── Query ─────────────────────────────────────────────────────────────────────

async function fetchOverpass(): Promise<OverpassResponse> {
  const query = `
[out:json][timeout:90];
(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service|living_street|pedestrian|footway|cycleway|path)$"](${BBOX});
);
out body;
>;
out skel qt;
`.trim()

  console.log(`[seed] Querying Overpass API (bbox: ${BBOX})…`)

  const headers = {
    'User-Agent':
      'StreetCheck/0.1 (civic road safety platform; https://github.com/sid529-gif/StreetCheck)',
    Accept: 'application/json',
  }

  // Try GET first (simpler, more compatible)
  try {
    const getUrl = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`
    console.log(`[seed] Trying GET: ${OVERPASS_URL}`)
    const response = await axios.get<OverpassResponse>(getUrl, {
      headers,
      timeout: 120_000,
      maxContentLength: 300 * 1024 * 1024,
    })
    return response.data
  } catch {
    console.log('[seed] GET failed, trying POST…')
  }

  // Fall back to POST
  const params = new URLSearchParams()
  params.set('data', query)

  const response = await axios.post<OverpassResponse>(OVERPASS_URL, params, {
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 120_000,
    maxContentLength: 300 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  })
  return response.data
}

// ── Process ───────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  const startMs = Date.now()
  console.log('[seed] StreetCheck Overpass seed starting…')

  let data: OverpassResponse
  try {
    data = await fetchOverpass()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[seed] Overpass fetch failed:', msg)
    await prisma.dataRefreshLog.create({
      data: {
        source: 'osm_overpass',
        status: 'failure',
        error: msg,
        durationMs: Date.now() - startMs,
      },
    })
    process.exit(1)
  }

  // Build node lookup map
  const nodeMap = new Map<number, { lat: number; lon: number }>()
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon })
    }
  }

  const ways = data.elements.filter((el): el is OverpassWay => el.type === 'way')
  console.log(`[seed] Received ${ways.length} ways, ${nodeMap.size} nodes`)

  // Build upsert records
  const records: {
    osmWayId: bigint
    name: string | null
    geometry: object
    bbox: object
    lightingScore: number
    accidentRate: number
    floodRisk: number
    surfaceQuality: number
    walkabilityScore: number
    safetyScore: number
    safetyBand: string
    scoringVersion: number
    osmLit: string | null
    osmSurface: string | null
    osmHighway: string | null
    osmFootway: string | null
    osmSidewalk: string | null
  }[] = []

  for (const way of ways) {
    const tags = way.tags ?? {}

    // Resolve node coordinates
    const coords: [number, number][] = []
    for (const nodeId of way.nodes) {
      const node = nodeMap.get(nodeId)
      if (node) coords.push([node.lon, node.lat]) // GeoJSON is [lng, lat]
    }

    // Skip ways with fewer than 2 resolved nodes
    if (coords.length < 2) continue

    const lightingScore = lightingFromOsm(tags.lit)
    const surfaceQuality = surfaceFromOsm(tags.surface)
    const walkabilityScore = walkabilityFromOsm(tags.footway, tags.sidewalk)
    const accidentRate = accidentRateFromHighway(tags.highway)
    const floodRisk = 0.1 // default; will be updated by HYDRAA data in Phase 2

    const safetyScore = computeSafetyScore({
      lightingScore,
      accidentRate,
      floodRisk,
      surfaceQuality,
      walkabilityScore,
    })
    const safetyBand = getSafetyBand(safetyScore)
    const bbox = computeBbox(coords)

    records.push({
      osmWayId: BigInt(way.id),
      name: tags.name ?? null,
      geometry: { type: 'LineString', coordinates: coords },
      bbox,
      lightingScore,
      accidentRate,
      floodRisk,
      surfaceQuality,
      walkabilityScore,
      safetyScore,
      safetyBand,
      scoringVersion: SCORING_VERSION,
      osmLit: tags.lit ?? null,
      osmSurface: tags.surface ?? null,
      osmHighway: tags.highway ?? null,
      osmFootway: tags.footway ?? null,
      osmSidewalk: tags.sidewalk ?? null,
    })
  }

  console.log(`[seed] Prepared ${records.length} valid segments for upsert`)

  // Upsert in batches
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((record) =>
        prisma.roadSegment.upsert({
          where: { osmWayId: record.osmWayId },
          create: record,
          update: {
            // Update OSM-derived fields but don't overwrite manually curated data
            name: record.name,
            geometry: record.geometry,
            bbox: record.bbox,
            osmLit: record.osmLit,
            osmSurface: record.osmSurface,
            osmHighway: record.osmHighway,
            osmFootway: record.osmFootway,
            osmSidewalk: record.osmSidewalk,
            lightingScore: record.lightingScore,
            surfaceQuality: record.surfaceQuality,
            walkabilityScore: record.walkabilityScore,
            safetyScore: record.safetyScore,
            safetyBand: record.safetyBand,
            scoringVersion: record.scoringVersion,
            lastOsmSync: new Date(),
          },
        })
      )
    )
    upserted += batch.length
    const pct = Math.round((upserted / records.length) * 100)
    process.stdout.write(`\r[seed] Upserted ${upserted}/${records.length} segments (${pct}%)`)
  }
  console.log() // newline after progress

  const durationMs = Date.now() - startMs

  // Log result
  await prisma.dataRefreshLog.create({
    data: {
      source: 'osm_overpass',
      status: 'success',
      recordsIn: ways.length,
      recordsOut: upserted,
      durationMs,
    },
  })

  console.log(
    `[seed] ✅ Done — ${upserted} segments upserted in ${(durationMs / 1000).toFixed(1)}s`
  )

  if (upserted < 5000) {
    console.warn(
      `[seed] ⚠️  Only ${upserted} segments seeded (target ≥5,000). ` +
        `Try setting OVERPASS_FULL_CITY=true or check the Overpass query.`
    )
  }

  await prisma.$disconnect()
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err)
  prisma.$disconnect().catch(() => null)
  process.exit(1)
})
