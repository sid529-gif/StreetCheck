/**
 * Overpass poller cron job — runs every 15 minutes.
 * Fetches fresh OSM way data for Hyderabad and upserts changed segments.
 */

import cron from 'node-cron'
import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { computeSafetyScore, getSafetyBand, SCORING_VERSION } from '@streetcheck/shared'
import { computeBbox } from '../db/geoQueries.js'
import { env } from '../env.js'

const prisma = new PrismaClient()

const FULL_CITY = env.OVERPASS_FULL_CITY
const OVERPASS_URL = env.OVERPASS_API_URL
const BBOX_DEMO = '17.32,78.38,17.50,78.55'
const BBOX_FULL = '17.20,78.30,17.60,78.60'
const BBOX = FULL_CITY ? BBOX_FULL : BBOX_DEMO

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
  tags?: Record<string, string | undefined>
}

interface OverpassResponse {
  elements: (OverpassNode | OverpassWay)[]
}

function lightingScore(lit: string | undefined): number {
  return (
    ({ yes: 0.9, '24/7': 1.0, automatic: 0.85, no: 0.1 } as Record<string, number>)[lit ?? ''] ??
    0.5
  )
}
function surfaceScore(surface: string | undefined): number {
  return (
    (
      {
        asphalt: 0.9,
        paved: 0.85,
        concrete: 0.85,
        compacted: 0.55,
        unpaved: 0.3,
        dirt: 0.2,
      } as Record<string, number>
    )[surface ?? ''] ?? 0.6
  )
}
function walkScore(footway: string | undefined, sidewalk: string | undefined): number {
  if (['yes', 'both', 'left', 'right'].includes(sidewalk ?? '') || footway === 'yes') return 0.9
  if (footway === 'no') return 0.2
  return 0.5
}
function accidentScore(highway: string | undefined): number {
  return (
    (
      {
        primary: 0.2,
        secondary: 0.15,
        tertiary: 0.12,
        residential: 0.08,
        service: 0.06,
        pedestrian: 0.03,
      } as Record<string, number>
    )[highway ?? ''] ?? 0.1
  )
}

async function pollOverpass(): Promise<void> {
  const startMs = Date.now()
  console.log('[overpassJob] Starting OSM poll…')

  let data: OverpassResponse
  try {
    const query = `[out:json][timeout:60];(way["highway"~"^(primary|secondary|tertiary|residential|service|pedestrian|footway|cycleway)$"](${BBOX}););out body;>;out skel qt;`
    const params = new URLSearchParams({ data: query })
    const resp = await axios.post<OverpassResponse>(OVERPASS_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'StreetCheck/0.1 (civic safety; https://github.com/sid529-gif/StreetCheck)',
      },
      timeout: 90_000,
      maxContentLength: 200 * 1024 * 1024,
    })
    data = resp.data
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[overpassJob] Fetch failed:', msg)
    await prisma.dataRefreshLog.create({
      data: {
        source: 'osm_overpass',
        status: 'failure',
        error: msg,
        durationMs: Date.now() - startMs,
      },
    })
    return
  }

  const nodeMap = new Map<number, { lat: number; lon: number }>()
  for (const el of data.elements) {
    if (el.type === 'node') nodeMap.set(el.id, { lat: el.lat, lon: el.lon })
  }

  const ways = data.elements.filter((el): el is OverpassWay => el.type === 'way')
  let upserted = 0

  for (const way of ways) {
    const tags = way.tags ?? {}
    const coords: [number, number][] = []
    for (const nodeId of way.nodes) {
      const n = nodeMap.get(nodeId)
      if (n) coords.push([n.lon, n.lat])
    }
    if (coords.length < 2) continue

    const ls = lightingScore(tags['lit'])
    const sq = surfaceScore(tags['surface'])
    const ws = walkScore(tags['footway'], tags['sidewalk'])
    const ar = accidentScore(tags['highway'])
    const fr = 0.1

    const safetyScore = computeSafetyScore({
      lightingScore: ls,
      accidentRate: ar,
      floodRisk: fr,
      surfaceQuality: sq,
      walkabilityScore: ws,
    })

    await prisma.roadSegment.upsert({
      where: { osmWayId: BigInt(way.id) },
      create: {
        osmWayId: BigInt(way.id),
        name: tags['name'] ?? null,
        geometry: { type: 'LineString', coordinates: coords },
        bbox: { ...computeBbox(coords) },
        lightingScore: ls,
        accidentRate: ar,
        floodRisk: fr,
        surfaceQuality: sq,
        walkabilityScore: ws,
        safetyScore,
        safetyBand: getSafetyBand(safetyScore),
        scoringVersion: SCORING_VERSION,
        osmLit: tags['lit'] ?? null,
        osmSurface: tags['surface'] ?? null,
        osmHighway: tags['highway'] ?? null,
        osmFootway: tags['footway'] ?? null,
        osmSidewalk: tags['sidewalk'] ?? null,
      },
      update: {
        name: tags['name'] ?? null,
        geometry: { type: 'LineString', coordinates: coords },
        bbox: { ...computeBbox(coords) },
        lightingScore: ls,
        surfaceQuality: sq,
        walkabilityScore: ws,
        safetyScore,
        safetyBand: getSafetyBand(safetyScore),
        scoringVersion: SCORING_VERSION,
        osmLit: tags['lit'] ?? null,
        osmSurface: tags['surface'] ?? null,
        osmHighway: tags['highway'] ?? null,
        osmFootway: tags['footway'] ?? null,
        osmSidewalk: tags['sidewalk'] ?? null,
        lastOsmSync: new Date(),
      },
    })
    upserted++
  }

  await prisma.dataRefreshLog.create({
    data: {
      source: 'osm_overpass',
      status: 'success',
      recordsIn: ways.length,
      recordsOut: upserted,
      durationMs: Date.now() - startMs,
    },
  })
  console.log(
    `[overpassJob] Done — ${upserted}/${ways.length} segments updated in ${((Date.now() - startMs) / 1000).toFixed(1)}s`
  )
}

export function startOverpassJob(): void {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    pollOverpass().catch((err: unknown) => {
      console.error('[overpassJob] Unhandled error:', err)
    })
  })
  console.log('[overpassJob] Scheduled — polling every 15 minutes')
}
