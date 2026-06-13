import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api.js'

export function FloatingStatsCard() {
  const { t } = useTranslation()

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['globalStats'],
    queryFn: api.getStats,
    refetchInterval: 30000, // refresh stats every 30s
  })

  // Mock online users - slightly dynamic but centered around 87
  const onlineUsers = 87

  if (isLoading) {
    return (
      <div className="absolute top-4 left-4 z-[1000] bg-[#111827]/90 backdrop-blur-md border border-[#1f2937] rounded-2xl p-4 shadow-2xl flex gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-24 h-10 bg-gray-800 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError || !stats) {
    return null // Gracefully hide if error
  }

  const safetyPercentage = Math.round(stats.safetyIndex * 100)

  // Safety Band label / color
  let safetyColor = 'text-[#10b981]'
  let safetyBg = 'bg-[#10b981]/10'
  if (stats.safetyIndex < 0.45) {
    safetyColor = 'text-[#ef4444]'
    safetyBg = 'bg-[#ef4444]/10'
  } else if (stats.safetyIndex < 0.75) {
    safetyColor = 'text-[#f59e0b]'
    safetyBg = 'bg-[#f59e0b]/10'
  }

  return (
    <div className="absolute top-20 left-4 md:top-4 md:left-4 z-[1000] bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-2xl p-3 md:p-4 shadow-2xl flex flex-row gap-4 md:gap-6 items-center text-white transition-all hover:border-gray-700 max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-none">
      {/* Covered Areas */}
      <div className="flex items-center gap-2.5 min-w-[95px]">
        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.446l-6.002.501a1.875 1.875 0 01-2.182-1.785V5.25a3.375 3.375 0 116.75 0v12.75a.75.75 0 01-.75.75h-.007z"
            />
          </svg>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {t('map.stats.areas', { defaultValue: 'Areas' })}
          </div>
          <div className="text-xs font-black text-white whitespace-nowrap">5 Covered</div>
        </div>
      </div>

      <div className="h-8 w-px bg-[#1f2937]" />

      {/* Active Hazards */}
      <div className="flex items-center gap-2.5 min-w-[95px]">
        <div className="p-2 bg-[#f59e0b]/10 text-[#f59e0b] rounded-xl">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {t('map.stats.hazards', { defaultValue: 'Hazards' })}
          </div>
          <div className="text-xs font-black text-white whitespace-nowrap">
            {stats.activeReports} Active
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-[#1f2937]" />

      {/* Online Users */}
      <div className="flex items-center gap-2.5 min-w-[95px]">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl relative">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20.08l-.071-.002c-2.18-.03-4.22-.68-5.918-1.772a4.125 4.125 0 00-7.533-2.493 9.307 9.307 0 004.122.953 9.378 9.378 0 002.625-.372M7.5 7.5a3 3 0 11-6 0 3 3 0 016 0zM17.5 6.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {t('map.stats.online', { defaultValue: 'Online' })}
          </div>
          <div className="text-xs font-black text-white whitespace-nowrap">{onlineUsers} Live</div>
        </div>
      </div>

      <div className="h-8 w-px bg-[#1f2937]" />

      {/* Safety Index */}
      <div className="flex items-center gap-2.5 min-w-[110px]">
        <div className={`p-2 ${safetyBg} ${safetyColor} rounded-xl`}>
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110.2 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0113.8 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
            />
          </svg>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {t('map.safetyIndex')}
          </div>
          <div className="text-xs font-black text-white whitespace-nowrap">{safetyPercentage}%</div>
        </div>
      </div>
    </div>
  )
}
export default FloatingStatsCard
