import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMapStore, type ActiveLayer } from '../store/mapStore.js'
import { useSessionStore } from '../store/sessionStore.js'
import { api, type RouteResult } from '../services/api.js'
import { SegmentLayer } from '../components/map/SegmentLayer.js'
import { ReportPins } from '../components/map/ReportPins.js'
import { SegmentDetailCard } from '../components/map/SegmentDetailCard.js'
import { ReportModal } from '../components/reporting/ReportModal.js'
import { RouteSearchBar } from '../components/routing/RouteSearchBar.js'
import { RouteComparisonPanel } from '../components/routing/RouteComparisonPanel.js'
import { ChatBubble } from '../components/assistant/ChatBubble.js'
import { AssistantPanel } from '../components/assistant/AssistantPanel.js'
import Navbar from '../components/navigation/Navbar.js'

// Fix default marker icon broken by Vite
import L from 'leaflet'
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png'
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Simple helper component to focus map on a coordinate or bound when it changes
function MapController({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (origin && destination) {
      // Zoom map to fit both points
      const bounds = [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ] as [[number, number], [number, number]]
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (origin) {
      map.setView([origin.lat, origin.lng], 14)
    }
  }, [origin, destination, map])

  return null
}

export default function MapPage() {
  const { t } = useTranslation()
  const selectedSegmentId = useMapStore((state) => state.selectedSegmentId)
  const activeLayer = useMapStore((state) => state.activeLayer)
  const setActiveLayer = useMapStore((state) => state.setActiveLayer)
  const { routeOrigin, routeDestination, setOrigin, setDestination } = useSessionStore()

  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [routes, setRoutes] = useState<RouteResult | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<'fastest' | 'safest'>('safest')

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [toastMessage])

  // React Query fetch for selected segment detail to pass to ReportModal
  const { data: segmentDetail } = useQuery({
    queryKey: ['segmentDetail', selectedSegmentId],
    queryFn: () => {
      if (!selectedSegmentId) return null
      return api.getSegmentDetail(selectedSegmentId)
    },
    enabled: !!selectedSegmentId,
  })

  // Route calculation mutation
  const routeMutation = useMutation({
    mutationFn: (req: {
      origin: { lat: number; lng: number }
      destination: { lat: number; lng: number }
    }) => {
      return api.computeRoutes({
        origin: req.origin,
        destination: req.destination,
      })
    },
    onSuccess: (data) => {
      setRoutes(data)
      setSelectedRoute('safest')
      setToastMessage(t('map.routesSuccess'))
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('map.routingFailed')
      setToastMessage(msg === t('map.routingFailed') ? msg : `${t('map.routingFailed')} ${msg}`)
    },
  })

  const handleRouteSearch = (
    originCoords: { lat: number; lng: number },
    destCoords: { lat: number; lng: number }
  ) => {
    routeMutation.mutate({ origin: originCoords, destination: destCoords })
  }

  const handleClearRoutes = () => {
    setRoutes(null)
    setOrigin(null)
    setDestination(null)
  }

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden bg-[#0a0f1a] text-white">
      {/* Reusable Navbar */}
      <Navbar />

      {/* Main split-pane content: Left Sidebar + Map */}
      <div
        className="flex-1 relative flex flex-col md:flex-row overflow-hidden"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        {/* LEFT SIDEBAR: Fixed 320px width, fills height */}
        <div
          className={`w-full md:w-[320px] h-[40vh] md:h-full bg-[#111827] border-b md:border-b-0 md:border-r border-[#1f2937] flex-col z-10 flex-shrink-0 overflow-y-auto order-last md:order-first ${selectedSegmentId ? 'hidden md:flex' : 'flex'}`}
        >
          {selectedSegmentId ? (
            <div className="hidden md:block h-full">
              <SegmentDetailCard onOpenReport={() => setIsReportModalOpen(true)} />
            </div>
          ) : routes ? (
            <RouteComparisonPanel
              routes={routes}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              onClear={handleClearRoutes}
            />
          ) : (
            <RouteSearchBar onSearch={handleRouteSearch} isPending={routeMutation.isPending} />
          )}
        </div>

        {/* MAP CONTAINER: fills remainder */}
        <div className="flex-1 h-full z-0 relative">
          {/* Floating Pill-style Layer Toggle (Top Right) */}
          <div className="absolute top-4 right-4 z-[1000] flex gap-1 bg-[#111827] rounded-full p-1 border border-[#1f2937] shadow-xl">
            {['All', 'Lighting', 'Flood', 'Surface', 'Walkability'].map((layer) => {
              const key = (layer === 'All' ? 'composite' : layer.toLowerCase()) as ActiveLayer
              const isActive = activeLayer === key
              return (
                <button
                  key={layer}
                  type="button"
                  onClick={() => setActiveLayer(key)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer
                    ${
                      isActive
                        ? 'bg-[#f59e0b] text-[#0a0f1a] shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                  {t(`map.layers.${key === 'composite' ? 'all' : key}`)}
                </button>
              )
            })}
          </div>

          {/* Map */}
          <MapContainer
            center={[17.385, 78.486]}
            zoom={13}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
            className="w-full h-full"
          >
            {/* Free OSM Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <SegmentLayer />
            <ReportPins />

            <MapController origin={routeOrigin} destination={routeDestination} />

            {/* Custom Origin/Destination pins */}
            {routeOrigin && (
              <CircleMarker
                center={[routeOrigin.lat, routeOrigin.lng]}
                radius={9}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Tooltip permanent direction="top">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    {t('map.origin')}
                  </span>
                </Tooltip>
              </CircleMarker>
            )}

            {routeDestination && (
              <CircleMarker
                center={[routeDestination.lat, routeDestination.lng]}
                radius={9}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Tooltip permanent direction="top">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    {t('map.destination')}
                  </span>
                </Tooltip>
              </CircleMarker>
            )}

            {/* Route overlays */}
            {routes && (
              <>
                <Polyline
                  positions={
                    routes.fastest.geometry.coordinates.map((c) => [c[1], c[0]]) as [
                      number,
                      number,
                    ][]
                  }
                  pathOptions={{
                    color: '#3b82f6',
                    weight: selectedRoute === 'fastest' ? 6 : 3,
                    dashArray: '8, 8',
                    opacity: selectedRoute === 'fastest' ? 0.9 : 0.45,
                  }}
                  eventHandlers={{
                    click: () => setSelectedRoute('fastest'),
                  }}
                />
                <Polyline
                  positions={
                    routes.safest.geometry.coordinates.map((c) => [c[1], c[0]]) as [
                      number,
                      number,
                    ][]
                  }
                  pathOptions={{
                    color: '#f59e0b',
                    weight: selectedRoute === 'safest' ? 7 : 3,
                    dashArray: '8, 8',
                    opacity: selectedRoute === 'safest' ? 0.95 : 0.45,
                  }}
                  eventHandlers={{
                    click: () => setSelectedRoute('safest'),
                  }}
                />
              </>
            )}
          </MapContainer>

          {/* Floating FAB Report Button (Bottom Right) */}
          <button
            onClick={() => {
              if (selectedSegmentId) {
                setIsReportModalOpen(true)
              } else {
                alert(t('map.reportPrompt'))
              }
            }}
            className="absolute bottom-24 right-4 z-[1000] flex items-center gap-2 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold px-5 py-3 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
          >
            <span className="text-base leading-none">⚠️</span> {t('map.reportButton')}
          </button>

          {/* Floating Chat Bubble & Assistant Panel */}
          <ChatBubble
            isOpen={isAssistantOpen}
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          />
          <AssistantPanel isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
        </div>
      </div>

      {/* Mobile Bottom Sheet for Segment Detail */}
      {selectedSegmentId && (
        <div className="md:hidden">
          <SegmentDetailCard onOpenReport={() => setIsReportModalOpen(true)} />
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && segmentDetail && (
        <ReportModal
          segment={segmentDetail}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={(msg) => setToastMessage(msg)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[10001] bg-[#111827] border border-[#1f2937] px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-md animate-bounce">
          <div className="bg-[#10b981] text-slate-900 rounded-full p-1 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {toastMessage}
          </span>
        </div>
      )}
    </div>
  )
}
