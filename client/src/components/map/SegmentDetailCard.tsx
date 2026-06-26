import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api.js'
import { useMapStore } from '../../store/mapStore.js'
import { ScoreDisplay } from '../common/ScoreDisplay.js'

interface SegmentDetailCardProps {
  onOpenReport: () => void
}

export function SegmentDetailCard({ onOpenReport }: SegmentDetailCardProps) {
  const { t } = useTranslation()
  const selectedSegmentId = useMapStore((state) => state.selectedSegmentId)
  const setSelectedSegment = useMapStore((state) => state.setSelectedSegment)

  const {
    data: segment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segmentDetail', selectedSegmentId],
    queryFn: () => {
      if (!selectedSegmentId) return null
      return api.getSegmentDetail(selectedSegmentId)
    },
    enabled: !!selectedSegmentId,
  })

  const { data: aiSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['aiSummary', selectedSegmentId],
    queryFn: () => {
      if (!selectedSegmentId) return null
      return api.getAiSummary(selectedSegmentId)
    },
    enabled: !!selectedSegmentId,
  })

  if (!selectedSegmentId) return null

  const getHazardLabel = (type: string) => {
    return t(`map.hazardsFull.${type}`, { defaultValue: type })
  }

  return (
    <div className="w-full h-[60vh] md:h-full bg-[#111827] text-white flex flex-col fixed bottom-0 left-0 right-0 z-[1000] rounded-t-3xl md:rounded-none border-t border-[#1f2937] md:border-none md:relative md:bottom-auto md:left-auto md:right-auto md:z-0 animate-in slide-in-from-bottom duration-300">
      {/* Drag handle for mobile */}
      <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto my-3 flex-shrink-0 md:hidden" />

      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[#1f2937] bg-[#0a0f1a] rounded-t-3xl md:rounded-none">
        <button
          onClick={() => setSelectedSegment(null)}
          type="button"
          className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
        >
          <span>&larr;</span> {t('map.back')}
        </button>
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-200 ml-2">
          {t('map.roadDetail')}
        </h4>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-[#1e2433] rounded-2xl" />
            <div className="h-4 bg-[#1e2433] rounded w-2/3" />
            <div className="h-4 bg-[#1e2433] rounded" />
            <div className="h-4 bg-[#1e2433] rounded" />
          </div>
        ) : error || !segment ? (
          <div className="text-center py-8 text-[#ef4444] text-xs font-bold">
            {t('map.segmentLoadError', { defaultValue: 'Failed to load street details.' })}
          </div>
        ) : (
          <>
            {/* Street Info & Score Summary */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-black text-white leading-tight uppercase tracking-wide">
                  {segment.name || t('map.unnamedStreet')}
                </h2>
                {segment.osmHighway && (
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {t('map.highway')}: {segment.osmHighway.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <div className="bg-[#1e2433] border border-[#2e3a52] rounded-2xl p-4 shadow-md">
                <ScoreDisplay score={segment.safetyScore} band={segment.safetyBand} size="lg" />
              </div>
            </div>

            {/* Score Dimensions */}
            <div className="space-y-4 pt-2 border-t border-[#1f2937]">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {t('map.safetyBreakdown')}
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: t('map.dimensions.school'),
                    score: (segment.school ?? segment.safetyScore) / 100,
                  },
                  {
                    label: t('map.dimensions.hospital'),
                    score: (segment.hospital ?? segment.safetyScore) / 100,
                  },
                  {
                    label: t('map.dimensions.park'),
                    score: (segment.park ?? segment.safetyScore) / 100,
                  },
                  {
                    label: t('map.dimensions.bus_stop'),
                    score: (segment.bus_stop ?? segment.safetyScore) / 100,
                  },
                  {
                    label: t('map.dimensions.footpath'),
                    score: (segment.footpath ?? segment.safetyScore) / 100,
                  },
                ].map((dim, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 font-semibold">{dim.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${dim.score * 100}%`,
                          background: `linear-gradient(90deg, #f59e0b, #22c55e)`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 w-8 text-right font-mono font-bold">
                      {Math.round(dim.score * 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary Card */}
            {loadingSummary ? (
              <div className="bg-[#0b1329] border border-[#1f2937] rounded-2xl p-4 space-y-2 animate-pulse">
                <div className="h-3.5 bg-[#1f2937] rounded w-1/3" />
                <div className="h-3 bg-[#1f2937] rounded w-full" />
                <div className="h-3 bg-[#1f2937] rounded w-4/5" />
              </div>
            ) : aiSummary ? (
              <div className="bg-[#0b1329] border border-[#f59e0b]/20 rounded-2xl p-4 bg-gradient-to-r from-[#0b1329] to-[#111827] space-y-1.5 shadow-md">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-[#f59e0b] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
                  {t('map.aiSummary')}
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed italic">
                  &quot;{aiSummary}&quot;
                </p>
              </div>
            ) : null}

            {/* Citizen Reports */}
            <div className="space-y-4 pt-2 border-t border-[#1f2937]">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t('map.hazardReports')}
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#0b1329] border border-[#1f2937] text-[10px] font-mono font-bold text-[#f59e0b]">
                  {segment.activeReports} {t('map.active')}
                </span>
              </div>

              {segment.reports && segment.reports.length > 0 ? (
                <div className="space-y-3">
                  {segment.reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-[#1e2433] border border-[#1f2937] rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white uppercase tracking-wider text-[10px]">
                          {getHazardLabel(rep.hazardType)}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {rep.description && (
                        <p className="text-gray-400 italic text-[11px]">
                          &quot;{rep.description}&quot;
                        </p>
                      )}
                      {rep.photoUrl && (
                        <div className="mt-1">
                          <img
                            src={rep.photoUrl}
                            alt="Hazard evidence"
                            className="w-full h-24 object-cover rounded-lg border border-[#2e3a52]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[10px] text-gray-500 bg-[#0a0f1a] border border-dashed border-[#1f2937] rounded-xl font-bold uppercase tracking-wider">
                  {t('map.allClear')}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Action */}
      {!isLoading && segment && (
        <div className="p-4 border-t border-[#1f2937] bg-[#0a0f1a] flex flex-col gap-2">
          <button
            onClick={onOpenReport}
            type="button"
            className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors text-center cursor-pointer shadow-lg active:scale-95"
          >
            {t('map.reportHere')}
          </button>
        </div>
      )}
    </div>
  )
}
export default SegmentDetailCard
