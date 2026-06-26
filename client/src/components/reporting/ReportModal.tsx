import type { HazardType } from '@streetcheck/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { type SegmentDetail, api } from '../../services/api.js'
import { useSessionStore } from '../../store/sessionStore.js'
import { HazardIconGrid } from './HazardIconGrid.js'
import { PhotoUploader } from './PhotoUploader.js'

interface ReportModalProps {
  segment: SegmentDetail
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

export function ReportModal({ segment, isOpen, onClose, onSuccess }: ReportModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const anonymousToken = useSessionStore((state) => state.anonymousToken)

  const [hazardType, setHazardType] = useState<HazardType | null>(null)
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Phase 6.4: AI CV Feedback loop states
  const [detectingPhoto, setDetectingPhoto] = useState(false)
  const [aiSuggestedType, setAiSuggestedType] = useState<HazardType | null>(null)
  const [cvConfidence, setCvConfidence] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  // Debounced NLP hazard classification on description text change
  useEffect(() => {
    // Only run NLP if there isn't a photo suggestion active
    if (photoUrl) return

    const trimmed = description.trim()
    if (!trimmed) {
      setAiSuggestedType(null)
      setCvConfidence(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const result = await api.classifyText(trimmed)
        if (result.suggestedType) {
          setAiSuggestedType(result.suggestedType)
          setCvConfidence(result.confidence)
          setHazardType((prev) => prev || result.suggestedType)
        } else {
          setAiSuggestedType(null)
          setCvConfidence(null)
        }
      } catch (err) {
        console.error('NLP text classification failed:', err)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [description, photoUrl])

  // Centroid of the segment for report coordinates
  const lat = (segment.bbox.minLat + segment.bbox.maxLat) / 2
  const lng = (segment.bbox.minLng + segment.bbox.maxLng) / 2

  const mutation = useMutation({
    mutationFn: () => {
      if (!hazardType) throw new Error('Hazard type is required')
      return api.submitReport({
        reporterToken: anonymousToken,
        lat,
        lng,
        hazardType,
        description: description.trim() || undefined,
        photoUrl,
        aiSuggestedType,
      })
    },
    onSuccess: (data) => {
      // Invalidate segments query to refresh heatmap
      queryClient.invalidateQueries({ queryKey: ['segments'] })
      queryClient.invalidateQueries({ queryKey: ['segmentDetail', segment.id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })

      onSuccess(
        t('map.reportModal.successMsg', {
          score: Math.round(data.updatedSegment.safetyScore * 100),
        })
      )
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to submit report.'
      setErrorMsg(msg)
    },
  })

  if (!isOpen) return null

  const isSubmitDisabled = !hazardType || uploadingPhoto || detectingPhoto || mutation.isPending

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      {/* Main Drawer Sheet */}
      <div className="relative z-10 w-full max-w-lg bg-[#111827] border-t border-x border-[#1f2937] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="px-6 pb-4 border-b border-[#1f2937] flex items-center justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              {t('map.reportModal.title')}
            </h2>
            <p className="text-xs text-gray-500 font-semibold truncate max-w-[280px] mt-0.5">
              {t('map.reportModal.near', { name: segment.name || t('map.unnamedStreet') })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('map.reportModal.cancel')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-2xl p-4 text-xs text-[#ef4444] font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Hazard Grid */}
          {(showGrid || !aiSuggestedType) && !detectingPhoto && (
            <HazardIconGrid
              selectedType={hazardType}
              onChange={(type) => {
                setHazardType(type)
                setErrorMsg(null)
              }}
              aiSuggestedType={aiSuggestedType}
            />
          )}

          {/* AI Detection Loading State */}
          {detectingPhoto && (
            <div className="flex flex-col items-center justify-center p-6 bg-[#1e2433] border border-[#1f2937] rounded-2xl space-y-3">
              <div className="h-6 w-6 border-3 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                {t('map.reportModal.aiRunning')}
              </p>
            </div>
          )}

          {/* AI Confirmation Banner */}
          {!detectingPhoto && photoUrl && aiSuggestedType && !showGrid && (
            <div className="bg-[#0b1329] border border-[#f59e0b]/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-start space-x-3.5">
                <span className="text-2xl mt-0.5">🤖</span>
                <div className="flex-1">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">
                    {t('map.reportModal.aiTitle')}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <Trans
                      i18nKey="map.reportModal.aiDesc"
                      values={{
                        type: aiSuggestedType
                          ? t('map.hazards.' + aiSuggestedType, {
                              defaultValue: aiSuggestedType.replace(/_/g, ' '),
                            })
                          : '',
                        confidence: Math.round((cvConfidence || 0) * 100),
                      }}
                    >
                      AI detected:{' '}
                      <span className="font-extrabold text-[#f59e0b] capitalize">
                        {aiSuggestedType
                          ? t('map.hazards.' + aiSuggestedType, {
                              defaultValue: aiSuggestedType.replace(/_/g, ' '),
                            })
                          : ''}
                      </span>{' '}
                      with{' '}
                      <span className="font-extrabold text-[#f59e0b]">
                        {Math.round((cvConfidence || 0) * 100)}%
                      </span>{' '}
                      confidence. Is this correct?
                    </Trans>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setHazardType(aiSuggestedType)
                    mutation.mutate()
                  }}
                  disabled={mutation.isPending}
                  className="flex-1 min-h-[44px] flex items-center justify-center px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-[#f59e0b]/50 disabled:cursor-not-allowed text-[#0a0f1a] font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {mutation.isPending
                    ? t('map.reportModal.submitting')
                    : t('map.reportModal.aiSubmit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGrid(true)
                  }}
                  className="flex-1 min-h-[44px] flex items-center justify-center px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider border border-[#1f2937] transition-all active:scale-95 cursor-pointer"
                >
                  {t('map.reportModal.aiChoose')}
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t('map.reportModal.noteLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('map.reportModal.notePlaceholder')}
              maxLength={500}
              rows={3}
              className="w-full rounded-2xl bg-[#1f2937] border border-[#2e3a52] p-3.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] transition-colors"
            />
          </div>

          {/* Photo Uploader */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
              📷 {t('map.reportModal.photoLabel')}
            </label>
            <PhotoUploader
              onUploadStart={() => {
                setUploadingPhoto(true)
                setAiSuggestedType(null)
                setCvConfidence(null)
              }}
              onUploadSuccess={async (url) => {
                setPhotoUrl(url)
                setUploadingPhoto(false)
                setDetectingPhoto(true)
                setErrorMsg(null)
                try {
                  const result = await api.detectPhoto(url)
                  if (result.suggestedType) {
                    setAiSuggestedType(result.suggestedType)
                    setCvConfidence(result.confidence)
                    setHazardType(result.suggestedType)
                    setShowGrid(false)
                  } else {
                    setAiSuggestedType(null)
                    setCvConfidence(null)
                  }
                } catch (err: any) {
                  console.error('Photo hazard detection failed:', err)
                } finally {
                  setDetectingPhoto(false)
                }
              }}
              onUploadError={(err) => {
                setUploadingPhoto(false)
                setErrorMsg(err)
              }}
            />
          </div>
        </div>

        {/* Footer Submit Button */}
        <div className="p-6 border-t border-[#1f2937] bg-[#0a0f1a] flex flex-col md:flex-row gap-3">
          <button
            onClick={onClose}
            type="button"
            className="w-full md:flex-1 h-12 md:py-3 bg-gray-800 border border-[#1f2937] hover:bg-gray-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors text-center cursor-pointer active:scale-95 flex items-center justify-center"
          >
            {t('map.reportModal.cancel')}
          </button>
          {(!photoUrl || !aiSuggestedType || showGrid) && (
            <button
              onClick={() => mutation.mutate()}
              disabled={isSubmitDisabled}
              type="button"
              className={`w-full md:flex-1 h-12 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center shadow-lg transition-all duration-200 flex items-center justify-center ${
                isSubmitDisabled
                  ? 'bg-[#f59e0b]/40 text-slate-900/60 cursor-not-allowed'
                  : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] cursor-pointer active:scale-95'
              }`}
            >
              {mutation.isPending
                ? t('map.reportModal.submitting')
                : t('map.reportModal.submitButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
export default ReportModal
