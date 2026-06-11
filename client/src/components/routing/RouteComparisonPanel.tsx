import { useQuery } from '@tanstack/react-query'
import type { RouteResult } from '../../services/api.js'
import { api } from '../../services/api.js'

interface RouteComparisonPanelProps {
  routes: RouteResult | null
  selectedRoute: 'fastest' | 'safest'
  onSelectRoute: (type: 'fastest' | 'safest') => void
  onClear: () => void
}

export function RouteComparisonPanel({
  routes,
  selectedRoute,
  onSelectRoute,
  onClear,
}: RouteComparisonPanelProps) {
  const { data: explanation, isLoading: loadingExplanation } = useQuery({
    queryKey: [
      'routeExplanation',
      routes?.fastest.segmentIds.join(',') || '',
      routes?.safest.segmentIds.join(',') || '',
    ],
    queryFn: () => {
      if (!routes) return ''
      return api.getRouteExplanation(routes.fastest.segmentIds, routes.safest.segmentIds)
    },
    enabled:
      !!routes && routes.fastest.segmentIds.length > 0 && routes.safest.segmentIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  if (!routes) return null

  const { fastest, safest } = routes

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25'
    if (score >= 45) return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/25'
    return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/25'
  }

  return (
    <div className="w-full p-5 bg-[#111827] text-white flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1f2937] pb-3">
        <button
          onClick={onClear}
          type="button"
          className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
        >
          <span>&larr;</span> Back
        </button>
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-200 ml-2">
          Compare Routes
        </h4>
      </div>

      {/* Grid selector */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3.5">
        {/* Fastest Card */}
        <button
          type="button"
          onClick={() => onSelectRoute('fastest')}
          className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            selectedRoute === 'fastest'
              ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]'
              : 'border-[#1f2937] bg-[#1e2433] text-gray-400 hover:border-blue-500/50'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-[9px] font-black uppercase tracking-wider text-white">
              ⚡ Fastest
            </span>
          </div>
          <div className="mt-2 text-lg font-black text-white leading-none">
            {fastest.estimatedTimeFormatted}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            {Math.round(fastest.totalDistanceM / 100) / 10} km
          </div>
          <div
            className={`mt-3.5 inline-flex items-center self-start text-[10px] px-2 py-0.5 rounded font-mono font-black border ${getScoreBg(fastest.overallSafetyScore)}`}
          >
            Score: {Math.round(fastest.overallSafetyScore)}
          </div>
        </button>

        {/* Safest Card */}
        <button
          type="button"
          onClick={() => onSelectRoute('safest')}
          className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            selectedRoute === 'safest'
              ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'border-[#1f2937] bg-[#1e2433] text-gray-400 hover:border-[#f59e0b]/50'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-[9px] font-black uppercase tracking-wider text-white">
              🛡️ Safest
            </span>
          </div>
          <div className="mt-2 text-lg font-black text-white leading-none">
            {safest.estimatedTimeFormatted}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            {Math.round(safest.totalDistanceM / 100) / 10} km
          </div>
          <div
            className={`mt-3.5 inline-flex items-center self-start text-[10px] px-2 py-0.5 rounded font-mono font-black border ${getScoreBg(safest.overallSafetyScore)}`}
          >
            Score: {Math.round(safest.overallSafetyScore)}
          </div>
        </button>
      </div>

      {/* AI Explanation */}
      {loadingExplanation ? (
        <div className="bg-[#0b1329] border border-[#1f2937] rounded-xl p-4 space-y-2.5 animate-pulse">
          <div className="h-3.5 bg-[#1f2937] rounded w-1/3" />
          <div className="h-3 bg-[#1f2937] rounded w-full" />
          <div className="h-3 bg-[#1f2937] rounded w-4/5" />
        </div>
      ) : explanation ? (
        <div className="bg-[#0b1329] border border-[#f59e0b]/20 rounded-xl p-4 bg-gradient-to-r from-[#0b1329] to-[#111827] space-y-1.5 shadow-md">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-[#f59e0b] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
            AI Route Insight
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed italic">
            &quot;{explanation}&quot;
          </p>
        </div>
      ) : null}

      {/* Selection action button strip */}
      <div className="flex gap-2.5 mt-2">
        <button
          onClick={() => onSelectRoute('fastest')}
          type="button"
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${
            selectedRoute === 'fastest'
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-[#1e2433] border-[#1f2937] hover:border-gray-600 text-gray-300'
          }`}
        >
          Select Fastest
        </button>
        <button
          onClick={() => onSelectRoute('safest')}
          type="button"
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${
            selectedRoute === 'safest'
              ? 'bg-[#f59e0b] border-[#f59e0b] text-[#0a0f1a]'
              : 'bg-[#1e2433] border-[#1f2937] hover:border-gray-600 text-gray-300'
          }`}
        >
          Select Safest
        </button>
      </div>

      {/* Safety Summary detail text */}
      <div className="text-[10px] text-gray-400 bg-[#0b1329] p-3.5 rounded-xl border border-[#1f2937] leading-relaxed mt-2">
        {selectedRoute === 'fastest' ? (
          <p>
            The <strong className="text-white">Fastest</strong> route takes the shortest physical
            distance. It contains{' '}
            <span className="text-[#ef4444] font-semibold">
              {fastest.hazardSummary.redSegments} unsafe segments
            </span>
            .
          </p>
        ) : (
          <p>
            The <strong className="text-white">Safest</strong> route prioritizes well-lit, low-risk
            streets, bypassing major hazard zones. It contains{' '}
            <span className="text-[#22c55e] font-semibold">
              {safest.hazardSummary.greenSegments} safe segments
            </span>
            .
          </p>
        )}
      </div>
    </div>
  )
}
export default RouteComparisonPanel
