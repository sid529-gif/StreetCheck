import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Polyline, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore.js'

// ── GeoJSON types matching street_segments.geojson ───────────────────────────

interface FeatureProperties {
  /** OSM way identifier e.g. "w28656749" */
  full_id: string
  /** Raw OSM numeric id */
  osm_id: string
  /** Composite safety score 0–100 (pre-computed from OSM proximity indicators) */
  safety_score: number
  // Optional OSM-proximity breakdown fields (may be absent in the static file)
  school?: number
  hospital?: number
  park?: number
  bus_stop?: number
  footpath?: number
  name?: string | null
}

interface SegmentFeature {
  type: 'Feature'
  id?: string
  properties: FeatureProperties
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

interface SegmentFeatureCollection {
  type: 'FeatureCollection'
  features: SegmentFeature[]
}

// ── Colour helpers ────────────────────────────────────────────────────────────

/**
 * Derive a hex stroke colour from a 0–100 safety score using the three-band
 * hierarchy specified in the Madhapur/Hitech City blueprint:
 *   score > 75 → green
 *   score > 45 → yellow
 *   else       → red
 */
function scoreToColor(score: number): string {
  if (score > 75) return '#22c55e' // green
  if (score > 45) return '#eab308' // yellow
  return '#ef4444' // red
}

/** Return a per-dimension indicator score (0–100) for a given layer key. */
function getDimensionScore(props: FeatureProperties, layer: string): number {
  switch (layer) {
    case 'school':
      return props.school ?? props.safety_score
    case 'hospital':
      return props.hospital ?? props.safety_score
    case 'park':
      return props.park ?? props.safety_score
    case 'bus_stop':
      return props.bus_stop ?? props.safety_score
    case 'footpath':
      return props.footpath ?? props.safety_score
    default:
      return props.safety_score
  }
}

// ── Single polyline component ─────────────────────────────────────────────────

function SegmentPolyline({
  feature,
  onClick,
}: {
  feature: SegmentFeature
  onClick: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const activeLayer = useMapStore((state) => state.activeLayer)

  const coords = feature.geometry.coordinates.map((c) => [c[1], c[0]]) as [number, number][]
  const props = feature.properties
  const segmentId = props.full_id

  const isComposite = activeLayer === 'composite'
  const score = isComposite ? props.safety_score : getDimensionScore(props, activeLayer)

  const color = scoreToColor(score)

  const layerLabel = isComposite
    ? 'Safety Score'
    : activeLayer.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' Proximity'

  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color,
        weight: hovered ? 7 : 4,
        opacity: hovered ? 0.95 : 0.75,
      }}
      eventHandlers={{
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
        click: () => onClick(segmentId),
      }}
    >
      <Tooltip sticky>
        <div className="font-semibold text-xs text-slate-800">
          {props.name || `Segment ${props.osm_id}`}
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">
          {layerLabel}: {score}%
        </div>
      </Tooltip>
    </Polyline>
  )
}

// ── Main layer component ──────────────────────────────────────────────────────

export function SegmentLayer() {
  const setSelectedSegment = useMapStore((state) => state.setSelectedSegment)
  const filters = useMapStore((state) => state.activeFilters)

  const { data, isFetching } = useQuery<SegmentFeatureCollection>({
    queryKey: ['segments-static'],
    queryFn: async () => {
      const res = await fetch('/street_segments.geojson')
      if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
      return res.json() as Promise<SegmentFeatureCollection>
    },
    // Static file — cache indefinitely within the session
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const features = data?.features ?? []

  // Apply local minScore filter (score is 0–100 in this dataset)
  const filteredFeatures = features.filter(
    (feat) => feat.properties.safety_score >= filters.minScore * 100
  )

  return (
    <>
      {isFetching && (
        <div className="absolute top-40 left-4 md:top-24 md:left-4 z-[1000] bg-[#111827]/90 backdrop-blur-sm border border-[#1f2937] p-3.5 rounded-xl shadow-xl flex flex-col gap-2 w-48 animate-pulse pointer-events-none">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
            Loading Map Data...
          </div>
          <div className="h-1.5 bg-gray-800 rounded w-full" />
          <div className="h-1.5 bg-gray-800 rounded w-5/6" />
          <div className="h-1.5 bg-gray-800 rounded w-4/5" />
        </div>
      )}
      {filteredFeatures.map((feat) => (
        <SegmentPolyline
          key={feat.properties.full_id}
          feature={feat}
          onClick={setSelectedSegment}
        />
      ))}
    </>
  )
}
