import { useState, useEffect } from 'react'
import { CircleMarker, Tooltip } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { useMapStore, type Viewport } from '../../store/mapStore.js'
import { api, type ReportPin } from '../../services/api.js'

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

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)))
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const HAZARD_LABELS: Record<string, string> = {
  pothole: 'Pothole 🕳️',
  broken_streetlight: 'Broken Light 💡',
  waterlogging: 'Waterlogging 🌊',
  construction_debris: 'Construction Debris 🚧',
  stray_animals: 'Stray Animals 🐕',
  broken_footpath: 'Broken Footpath 🚶',
  open_manhole: 'Open Manhole ⚠️',
}

export function ReportPins() {
  const viewport = useMapStore((state) => state.viewport)
  const debouncedViewport = useDebounce<Viewport | null>(viewport, 400)

  const { data: reports = [] } = useQuery<ReportPin[]>({
    queryKey: ['reports', debouncedViewport],
    queryFn: async () => {
      if (!debouncedViewport) return []
      return api.getReports(debouncedViewport)
    },
    enabled: !!debouncedViewport,
    staleTime: 15_000,
  })

  return (
    <>
      {reports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.lat, report.lng]}
          radius={7}
          pathOptions={{
            color: '#f97316',
            fillColor: '#ea580c',
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Tooltip>
            <div className="font-semibold text-xs text-slate-800">
              {HAZARD_LABELS[report.hazardType] || report.hazardType}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Reported {timeAgo(report.createdAt)}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}
