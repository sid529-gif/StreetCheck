import { useEffect, useState } from 'react'
import { useMapEvents, Polyline, Tooltip } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { useMapStore, type Viewport } from '../../store/mapStore.js'
import { api } from '../../services/api.js'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface FeatureProperties {
  id: string
  safetyScore: number
  safetyBand: 'green' | 'amber' | 'red'
  activeReports: number
  osmHighway: string | null
  osmLit: string | null
  name: string | null
  lightingScore: number
  accidentRate: number
  floodRisk: number
  surfaceQuality: number
  walkabilityScore: number
}

interface SegmentFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  properties: FeatureProperties
}

interface SegmentFeatureCollection {
  type: 'FeatureCollection'
  features: SegmentFeature[]
}

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
  const { name, safetyScore, lightingScore, floodRisk, surfaceQuality, walkabilityScore } =
    feature.properties

  let color = '#6b7280'
  let layerLabel = 'Safety Score'
  let layerValue = Math.round(safetyScore * 100)

  if (activeLayer === 'composite') {
    layerLabel = 'Safety Score'
    layerValue = Math.round(safetyScore * 100)
    if (layerValue <= 20)
      color = '#991b1b' // Dark Red
    else if (layerValue <= 40)
      color = '#ef4444' // Red
    else if (layerValue <= 60)
      color = '#f97316' // Orange
    else if (layerValue <= 75)
      color = '#eab308' // Yellow
    else if (layerValue <= 90)
      color = '#4ade80' // Light Green
    else color = '#15803d' // Dark Green
  } else if (activeLayer === 'lighting') {
    layerLabel = 'Lighting Score'
    layerValue = Math.round(lightingScore * 100)
    if (layerValue >= 76)
      color = '#22c55e' // Green
    else if (layerValue >= 41)
      color = '#eab308' // Yellow
    else color = '#ef4444' // Red
  } else if (activeLayer === 'flood') {
    layerLabel = 'Flood Risk'
    layerValue = Math.round(floodRisk * 100)
    if (layerValue <= 20)
      color = '#22c55e' // Green (Low Risk)
    else if (layerValue <= 50)
      color = '#eab308' // Yellow (Medium Risk)
    else if (layerValue <= 80)
      color = '#ef4444' // Red (High Risk)
    else color = '#991b1b' // Dark Red (Extreme Risk)
  } else if (activeLayer === 'surface') {
    layerLabel = 'Surface Quality'
    layerValue = Math.round(surfaceQuality * 100)
    if (layerValue >= 76)
      color = '#22c55e' // Green (Excellent)
    else if (layerValue >= 51)
      color = '#eab308' // Yellow (Fair)
    else if (layerValue >= 26)
      color = '#f97316' // Orange (Poor)
    else color = '#ef4444' // Red (Damaged)
  } else if (activeLayer === 'walkability') {
    layerLabel = 'Walkability'
    layerValue = Math.round(walkabilityScore * 100)
    if (layerValue >= 91)
      color = '#15803d' // Dark Green (Excellent)
    else if (layerValue >= 76)
      color = '#22c55e' // Green (Good)
    else if (layerValue >= 51)
      color = '#eab308' // Yellow (Average)
    else if (layerValue >= 26)
      color = '#f97316' // Orange (Poor)
    else color = '#ef4444' // Red (Very Poor)
  }

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
        click: () => onClick(feature.properties.id),
      }}
    >
      <Tooltip sticky>
        <div className="font-semibold text-xs text-slate-800">{name || 'Unnamed Street'}</div>
        <div className="text-[10px] text-slate-600 mt-0.5">
          {layerLabel}: {layerValue}%
        </div>
      </Tooltip>
    </Polyline>
  )
}

export function SegmentLayer() {
  const viewport = useMapStore((state) => state.viewport)
  const setViewport = useMapStore((state) => state.setViewport)
  const setSelectedSegment = useMapStore((state) => state.setSelectedSegment)
  const filters = useMapStore((state) => state.activeFilters)

  // Track map state for initial or moved updates
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      setViewport({
        minLng: bounds.getSouthWest().lng,
        minLat: bounds.getSouthWest().lat,
        maxLng: bounds.getNorthEast().lng,
        maxLat: bounds.getNorthEast().lat,
      })
    },
  })

  // Set initial viewport on mount
  useEffect(() => {
    const bounds = map.getBounds()
    setViewport({
      minLng: bounds.getSouthWest().lng,
      minLat: bounds.getSouthWest().lat,
      maxLng: bounds.getNorthEast().lng,
      maxLat: bounds.getNorthEast().lat,
    })
  }, [map, setViewport])

  // Debounce the viewport updates to prevent network request storm
  const debouncedViewport = useDebounce<Viewport | null>(viewport, 300)

  const { data, isFetching } = useQuery<SegmentFeatureCollection>({
    queryKey: ['segments', debouncedViewport, filters.minScore],
    queryFn: async () => {
      if (!debouncedViewport) {
        return { type: 'FeatureCollection', features: [] }
      }
      return (await api.getSegments(debouncedViewport)) as SegmentFeatureCollection
    },
    enabled: !!debouncedViewport,
    staleTime: 15_000,
  })

  const features = data?.features || []

  // Filter local results based on score threshold
  const filteredFeatures = features.filter((feat) => {
    return feat.properties.safetyScore >= filters.minScore
  })

  return (
    <>
      {isFetching && (
        <div className="absolute top-40 left-4 md:top-24 md:left-4 z-[1000] bg-[#111827]/90 backdrop-blur-sm border border-[#1f2937] p-3.5 rounded-xl shadow-xl flex flex-col gap-2 w-48 animate-pulse pointer-events-none">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
            Syncing Map Data...
          </div>
          <div className="h-1.5 bg-gray-800 rounded w-full" />
          <div className="h-1.5 bg-gray-800 rounded w-5/6" />
          <div className="h-1.5 bg-gray-800 rounded w-4/5" />
        </div>
      )}
      {filteredFeatures.map((feat) => (
        <SegmentPolyline key={feat.id} feature={feat} onClick={setSelectedSegment} />
      ))}
    </>
  )
}
