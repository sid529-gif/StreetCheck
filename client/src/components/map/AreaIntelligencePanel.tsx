import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useMapStore } from '../../store/mapStore.js'

type TabType = 'overview' | 'lighting' | 'flood' | 'surface' | 'walkability'

interface AreaDetails {
  name: string
  safetyScore: number
  lightingScore: number
  floodRisk: number
  surfaceQuality: number
  walkabilityScore: number
  activeReports: number
  trend: 'improving' | 'deteriorating' | 'stable'
  reportedDarkSpots: number
  floodProneCount: number
  potholeDensity: number
  sidewalkCoverage: number
  pedestrianFriendliness: string
  crossingAvailability: string
  maintenanceHistory: string
}

export function AreaIntelligencePanel() {
  const selectedAreaName = useMapStore((state) => state.selectedAreaName)
  const setSelectedAreaName = useMapStore((state) => state.setSelectedAreaName)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const {
    data: area,
    isLoading,
    error,
  } = useQuery<AreaDetails>({
    queryKey: ['areaDetails', selectedAreaName],
    queryFn: async () => {
      if (!selectedAreaName) return null as any
      // Call standard fetch from backend
      const res = await fetch(`/api/areas/${selectedAreaName}`)
      if (!res.ok) throw new Error('Failed to fetch area data')
      return res.json()
    },
    enabled: !!selectedAreaName,
  })

  if (!selectedAreaName) return null

  const getTrendIcon = (t?: string) => {
    if (t === 'improving')
      return <span className="text-emerald-500 font-extrabold">↑ Improving</span>
    if (t === 'deteriorating')
      return <span className="text-rose-500 font-extrabold">↓ Deteriorating</span>
    return <span className="text-amber-500 font-extrabold">→ Stable</span>
  }

  return (
    <div className="flex flex-col h-full bg-[#111827] border-l border-[#1f2937] text-white shadow-2xl relative w-full md:w-[360px] flex-shrink-0 animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="p-5 border-b border-[#1f2937] flex items-center justify-between bg-[#0a0f1a]">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-[#f59e0b]">
            Area Intelligence
          </h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
            {isLoading ? 'Loading...' : area?.name || selectedAreaName}
          </p>
        </div>
        <button
          onClick={() => setSelectedAreaName(null)}
          className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          type="button"
        >
          ✕
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 p-6 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#f59e0b] border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Analyzing Area...
          </span>
        </div>
      )}

      {error && (
        <div className="flex-1 p-6 flex flex-col justify-center items-center text-center gap-2">
          <span className="text-2xl">⚠️</span>
          <span className="text-xs text-rose-400 font-bold">Failed to load area data</span>
          <p className="text-[10px] text-gray-500 mt-1">Please try again later</p>
        </div>
      )}

      {!isLoading && !error && area && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main area stats banner */}
          <div className="p-5 bg-gradient-to-b from-[#0a0f1a] to-transparent border-b border-[#1f2937]/50 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Overall Safety Score
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-white">
                  {Math.round(area.safetyScore * 100)}
                </span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {getTrendIcon(area.trend)}
              </div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                Trend (Last 7d)
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 border-b border-[#1f2937] flex gap-1 overflow-x-auto scrollbar-none bg-[#0a0f1a]/50">
            {(['overview', 'lighting', 'flood', 'surface', 'walkability'] as TabType[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-[#f59e0b] text-[#f59e0b]'
                      : 'border-transparent text-gray-500 hover:text-white'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Quick Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Lighting
                      </span>
                      <span className="text-lg font-extrabold">
                        {Math.round(area.lightingScore * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Flood Safety
                      </span>
                      <span className="text-lg font-extrabold">
                        {Math.round((1 - area.floodRisk) * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Surface Quality
                      </span>
                      <span className="text-lg font-extrabold">
                        {Math.round(area.surfaceQuality * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Walkability
                      </span>
                      <span className="text-lg font-extrabold">
                        {Math.round(area.walkabilityScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937]/30 border border-[#1f2937] rounded-xl p-4 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#f59e0b]">
                    Area Overview
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    This analysis is compiled from street segments in {area.name}. The safety rating
                    represents lighting coverage, flood risk maps, and user reports. Active reports
                    currently stand at {area.activeReports} active citizen complaints.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'lighting' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💡</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Lighting Infrastructure
                    </h3>
                    <p className="text-[10px] text-gray-500">Streetlight density and outage maps</p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Reported Dark Spots
                    </span>
                    <span className="text-sm font-black text-rose-500">
                      {area.reportedDarkSpots} active
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Streetlight Density
                    </span>
                    <span className="text-sm font-black text-[#f59e0b]">
                      {Math.round(area.lightingScore * 100)}% coverage
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Citizen Feedback
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.reportedDarkSpots > 0
                        ? 'Multiple unlit stretches reported. Commuters are advised to exercise caution after dusk.'
                        : 'No recent streetlight outages reported. Lighting infrastructure remains stable.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'flood' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🌊</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Flood Vulnerability
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Monsoon waterlogging & low-lying zones
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Waterlogging Hotspots
                    </span>
                    <span className="text-sm font-black text-rose-500">
                      {area.floodProneCount} active
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Flood Risk Index
                    </span>
                    <span className="text-sm font-black text-amber-500">
                      {Math.round(area.floodRisk * 100)}% vulnerability
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Disaster Risk Summary
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.floodRisk > 0.4
                        ? 'Low-lying geography makes this region susceptible to waterlogging during heavy downpours. Avoid underpasses.'
                        : 'Low flood vulnerability mapped. Primary storm drains are functional.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'surface' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🛣️</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Road Surface Condition
                    </h3>
                    <p className="text-[10px] text-gray-500">Potholes & maintenance quality</p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Active Potholes
                    </span>
                    <span className="text-sm font-black text-rose-500">
                      {area.potholeDensity} reported
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Quality Score
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {Math.round(area.surfaceQuality * 100)}% excellent
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Maintenance History
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.maintenanceHistory}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'walkability' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🚶</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Pedestrian Accessibility
                    </h3>
                    <p className="text-[10px] text-gray-500">Footpaths & walkability scores</p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Sidewalk Coverage
                    </span>
                    <span className="text-sm font-black text-[#f59e0b]">
                      {Math.round(area.sidewalkCoverage * 100)}% mapped
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Pedestrian Friendliness
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {area.pedestrianFriendliness}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Crossing Availability
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {area.crossingAvailability}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default AreaIntelligencePanel
