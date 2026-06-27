import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { type AreaDetails, api } from '../../services/api.js'
import { useMapStore } from '../../store/mapStore.js'

type TabType = 'overview' | 'school' | 'hospital' | 'park' | 'bus_stop' | 'footpath'

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
    queryFn: () => {
      if (!selectedAreaName) return null as any
      return api.getAreaDetails(selectedAreaName)
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

  // Get display name of zone
  const getAreaDisplayName = (key: string) => {
    switch (key) {
      case 'hotspot-north':
        return 'North Sector'
      case 'hotspot-central':
        return 'Central Hotspot'
      case 'hotspot-south':
        return 'South Sector'
      case 'hotspot-east':
        return 'East Corridor'
      case 'hotspot-west':
        return 'West Corridor'
      default:
        return key.replace('-', ' ')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#111827] border-l border-[#1f2937] text-white shadow-2xl relative w-full md:w-[360px] flex-shrink-0 animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="p-5 border-b border-[#1f2937] flex items-center justify-between bg-[#0a0f1a]">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-[#f59e0b]">Area Intel</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
            {isLoading ? 'Loading...' : area?.name || getAreaDisplayName(selectedAreaName)}
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
            {(['overview', 'school', 'hospital', 'park', 'bus_stop', 'footpath'] as TabType[]).map(
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
                  {tab === 'bus_stop'
                    ? 'Bus Stop'
                    : tab === 'overview'
                      ? 'Overview'
                      : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    Scoring Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        School Proximity
                      </span>
                      <span className="text-lg font-extrabold text-blue-400">
                        {Math.round(area.school * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Hospital Proximity
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400">
                        {Math.round(area.hospital * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Park Proximity
                      </span>
                      <span className="text-lg font-extrabold text-teal-400">
                        {Math.round(area.park * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Bus Stop
                      </span>
                      <span className="text-lg font-extrabold text-amber-400">
                        {Math.round(area.bus_stop * 100)}%
                      </span>
                    </div>
                    <div className="bg-[#1f2937]/40 border border-[#1f2937] rounded-xl p-3.5 flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Footpath Presence
                      </span>
                      <span className="text-lg font-extrabold text-indigo-400">
                        {Math.round(area.footpath * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937]/30 border border-[#1f2937] rounded-xl p-4 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#f59e0b]">
                    Area Summary
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    This analysis is compiled from street segments in {area.name}. The safety rating
                    represents safety proximity indicators calculated from verified Swecha OSM
                    dataset layers. Active reports currently stand at {area.activeReports} active
                    citizen complaints.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'school' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🏫</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      School Proximity
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Access and proximity to educational zones
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Indicator Score
                    </span>
                    <span className="text-sm font-black text-blue-400">
                      {Math.round(area.school * 100)}%
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Assessment
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.school >= 0.75
                        ? 'High density of educational infrastructure. Road zones should strictly enforce school zone speed limits and zebra crossing presence.'
                        : 'Moderate or low proximity to schools. Standard arterial safety rules apply.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hospital' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🏥</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Hospital Proximity
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Access to emergency medical facilities
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Indicator Score
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      {Math.round(area.hospital * 100)}%
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Assessment
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.hospital >= 0.75
                        ? 'Excellent proximity to healthcare centers. Traffic corridors are critical for emergency vehicles. Silent zones should be respected.'
                        : 'Moderate proximity to health centers. Standard route safety priority.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'park' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🌳</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">Park Proximity</h3>
                    <p className="text-[10px] text-gray-500">Proximity to green public spaces</p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Indicator Score
                    </span>
                    <span className="text-sm font-black text-teal-400">
                      {Math.round(area.park * 100)}%
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Assessment
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.park >= 0.7
                        ? 'High proximity to urban green spaces. Pedestrian safety and active transport paths are highly recommended in this zone.'
                        : 'Moderate proximity to recreational spaces.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bus_stop' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🚌</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Bus Stop Proximity
                    </h3>
                    <p className="text-[10px] text-gray-500">Access to public transit options</p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Indicator Score
                    </span>
                    <span className="text-sm font-black text-amber-500">
                      {Math.round(area.bus_stop * 100)}%
                    </span>
                  </div>

                  <div className="p-4 bg-[#1f2937]/20 border border-[#1f2937] rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      Transit Assessment
                    </span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {area.bus_stop >= 0.7
                        ? 'High density of public transit points. Frequent foot traffic, requiring safe road-crossing corridors and adequate pavement illumination.'
                        : 'Transit options are spread out. Commute times to public transport might be longer.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'footpath' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🚶</div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Footpath Presence
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Dedicated walking lanes & sidewalk coverage
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1f2937] pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Pavement Mapped
                    </span>
                    <span className="text-sm font-black text-indigo-400">
                      {Math.round(area.footpath * 100)}% coverage
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Accessibility Level
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {area.pedestrianFriendliness}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#1f2937]/35 p-3.5 rounded-xl border border-[#1f2937]">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Crossing Points
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
