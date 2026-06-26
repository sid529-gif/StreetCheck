/**
 * StreetCheck — Routing Service
 *
 * Builds a graphology DirectedGraph from road segments and runs Dijkstra
 * twice to return the fastest and safest routes between two points.
 *
 * Nodes: road segment endpoint coordinates encoded as "lng,lat" strings
 * Edges: one directed edge per segment, from first coordinate to last coordinate
 *
 * Weights:
 *   distanceWeight  = Haversine distance in meters (for fastest route)
 *   safetyWeight    = (1 - safetyScore) × distanceWeight  (for safest route)
 *
 * Constitution rules obeyed:
 *   - Routing via graphology only — no Python routing logic
 *   - All geometry from PostGIS ($queryRaw)
 */

import { MultiDirectedGraph } from 'graphology'
import shortestPath from 'graphology-shortest-path'
const { dijkstra } = shortestPath
import { getSafetyBand } from '@streetcheck/shared'
import { prisma } from '../db/prisma.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SegmentRow {
  id: string
  geometry: { type: string; coordinates: [number, number][] }
  safetyScore: number
  safetyBand: string
  activeReports: number
}

export interface RouteOption {
  label: string
  totalDistanceM: number
  estimatedTimeS: number
  estimatedTimeFormatted: string
  overallSafetyScore: number
  safetyBand: 'green' | 'amber' | 'red'
  segmentIds: string[]
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  hazardSummary: {
    redSegments: number
    amberSegments: number
    greenSegments: number
    activeReports: number
  }
}

// Map from edge key → segment data
const segmentByEdge = new Map<string, SegmentRow>()
// The routing graph (rebuilt on startup and after score updates)
let routingGraph: MultiDirectedGraph | null = null

// ── Haversine distance ────────────────────────────────────────────────────────

function haversineMeters([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nodeKey(coord: [number, number]): string {
  return `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`
}

// ── Build graph ───────────────────────────────────────────────────────────────

export async function buildRoutingGraph(): Promise<void> {
  const rows = await prisma.$queryRaw<SegmentRow[]>`
    SELECT
      id,
      geometry,
      safety_score AS "safetyScore",
      safety_band  AS "safetyBand",
      active_reports AS "activeReports"
    FROM road_segments
    WHERE jsonb_array_length((geometry->'coordinates')) >= 2
  `

  const graph = new MultiDirectedGraph({ allowSelfLoops: false })
  segmentByEdge.clear()

  for (const seg of rows) {
    const coords = seg.geometry.coordinates
    if (!coords || coords.length < 2) continue

    const first = coords[0]
    const last = coords[coords.length - 1]
    if (!first || !last) continue

    const fromNode = nodeKey(first)
    const toNode = nodeKey(last)
    if (fromNode === toNode) continue

    const distM = haversineMeters(first, last)
    const safetyWeight = (1 - Math.max(0, Math.min(1, seg.safetyScore))) * distM

    if (!graph.hasNode(fromNode)) graph.addNode(fromNode, { lng: first[0], lat: first[1] })
    if (!graph.hasNode(toNode)) graph.addNode(toNode, { lng: last[0], lat: last[1] })

    const edgeKey = graph.addEdge(fromNode, toNode, {
      distanceWeight: distM,
      safetyWeight,
      segmentId: seg.id,
    })

    segmentByEdge.set(edgeKey, seg)

    // Also add reverse edge (roads are bidirectional)
    const reverseKey = graph.addEdge(toNode, fromNode, {
      distanceWeight: distM,
      safetyWeight,
      segmentId: seg.id,
    })
    segmentByEdge.set(reverseKey, seg)
  }

  routingGraph = graph
  console.log(
    `[routing] Graph built — ${graph.order} nodes, ${graph.size} edges from ${rows.length} segments`
  )
}

// ── Nearest graph node ────────────────────────────────────────────────────────

function nearestNode(graph: MultiDirectedGraph, lat: number, lng: number): string | null {
  let best: string | null = null
  let bestDist = Infinity

  graph.forEachNode((nodeId: string, attrs: Record<string, unknown>) => {
    const d = haversineMeters([lng, lat], [attrs['lng'] as number, attrs['lat'] as number])
    if (d < bestDist) {
      bestDist = d
      best = nodeId
    }
  })

  return best
}

// ── Aggregate route from path ─────────────────────────────────────────────────

function aggregateRoute(graph: MultiDirectedGraph, path: string[], label: string): RouteOption {
  const coordinates: [number, number][] = []
  const segmentIds: string[] = []
  let totalDistM = 0
  let weightedScoreSum = 0
  let red = 0
  let amber = 0
  let green = 0
  let activeReports = 0

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!
    const to = path[i + 1]!

    // Find the edge between these two nodes
    let bestEdge: string | null = null
    let bestDist = Infinity
    graph.forEachEdge(from, to, (edge: string, attrs: Record<string, unknown>) => {
      const d = attrs['distanceWeight'] as number
      if (d < bestDist) {
        bestDist = d
        bestEdge = edge
      }
    })

    if (!bestEdge) continue
    const seg = segmentByEdge.get(bestEdge)
    if (!seg) continue

    segmentIds.push(seg.id)
    totalDistM += bestDist
    weightedScoreSum += seg.safetyScore * bestDist
    activeReports += seg.activeReports

    if (seg.safetyBand === 'red') red++
    else if (seg.safetyBand === 'amber') amber++
    else green++

    // Collect coordinates (avoid duplicating junction points)
    const coords = seg.geometry.coordinates
    if (coordinates.length === 0) {
      coordinates.push(...coords)
    } else {
      coordinates.push(...coords.slice(1))
    }
  }

  const overallSafetyScore =
    totalDistM > 0 ? Math.round((weightedScoreSum / totalDistM) * 100) / 100 : 0

  // Assume average speed of 30 km/h for urban Hyderabad roads
  const estimatedTimeS = Math.round((totalDistM / 30_000) * 3600)
  const mins = Math.floor(estimatedTimeS / 60)
  const secs = estimatedTimeS % 60
  const estimatedTimeFormatted = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`

  return {
    label,
    totalDistanceM: Math.round(totalDistM),
    estimatedTimeS,
    estimatedTimeFormatted,
    overallSafetyScore,
    safetyBand: getSafetyBand(overallSafetyScore),
    segmentIds,
    geometry: { type: 'LineString', coordinates },
    hazardSummary: { redSegments: red, amberSegments: amber, greenSegments: green, activeReports },
  }
}

// ── Compute routes ────────────────────────────────────────────────────────────

export interface ComputeRoutesInput {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export interface ComputeRoutesResult {
  fastest: RouteOption
  safest: RouteOption
  originNode: string
  destinationNode: string
}

export async function computeRoutes(input: ComputeRoutesInput): Promise<ComputeRoutesResult> {
  if (!routingGraph) {
    await buildRoutingGraph()
  }
  const graph = routingGraph!

  const originNode = nearestNode(graph, input.origin.lat, input.origin.lng)
  const destNode = nearestNode(graph, input.destination.lat, input.destination.lng)

  if (!originNode || !destNode) {
    throw new Error('Cannot find graph nodes near the provided coordinates')
  }
  if (originNode === destNode) {
    throw new Error('Origin and destination resolve to the same graph node')
  }

  // Run Dijkstra for fastest (distance) and safest (safety weight)
  const fastestPath = dijkstra.bidirectional(graph, originNode, destNode, 'distanceWeight')
  const safestPath = dijkstra.bidirectional(graph, originNode, destNode, 'safetyWeight')

  if (!fastestPath) throw new Error('No route found between origin and destination')
  if (!safestPath) throw new Error('No safe route found between origin and destination')

  return {
    fastest: aggregateRoute(graph, fastestPath, 'Fastest'),
    safest: aggregateRoute(graph, safestPath, 'Safest'),
    originNode,
    destinationNode: destNode,
  }
}

export function isGraphReady(): boolean {
  return routingGraph !== null
}
