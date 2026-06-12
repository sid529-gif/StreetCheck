import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../store/sessionStore.js'

interface RouteSearchBarProps {
  onSearch: (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => void
  isPending: boolean
}

const LANDMARKS: Record<string, [number, number]> = {
  kondapur: [17.462, 78.356],
  gachibowli: [17.44, 78.348],
  hiteccity: [17.448, 78.381],
  banjarahills: [17.415, 78.434],
  madhapur: [17.448, 78.39],
}

export function RouteSearchBar({ onSearch, isPending }: RouteSearchBarProps) {
  const { t } = useTranslation()
  const { setOrigin, setDestination } = useSessionStore()
  const [originInput, setOriginInput] = useState('')
  const [destInput, setDestInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const findCoords = (val: string): { lat: number; lng: number } | null => {
    const norm = val.trim().toLowerCase().replace(/\s+/g, '')
    if (!norm) return null

    // Check English presets
    if (norm in LANDMARKS) {
      const coords = LANDMARKS[norm]!
      return { lat: coords[0], lng: coords[1] }
    }

    // Check localized presets
    for (const key of Object.keys(LANDMARKS)) {
      const localized = t(`map.areas.${key}`).trim().toLowerCase().replace(/\s+/g, '')
      if (norm === localized) {
        const coords = LANDMARKS[key]!
        return { lat: coords[0], lng: coords[1] }
      }
    }

    // Lat, Lng parse
    const parts = val.split(',').map((p) => parseFloat(p.trim()))
    if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
      return { lat: parts[0]!, lng: parts[1]! }
    }

    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const originCoords = findCoords(originInput)
    const destCoords = findCoords(destInput)

    if (!originCoords) {
      setErrorMsg(t('map.finder.errOrigin'))
      return
    }
    if (!destCoords) {
      setErrorMsg(t('map.finder.errDest'))
      return
    }

    setOrigin(originCoords)
    setDestination(destCoords)
    onSearch(originCoords, destCoords)
  }

  const handleChipClick = (landmark: string) => {
    setErrorMsg(null)
    const startName = t('map.areas.kondapur')
    const destName = t(`map.areas.${landmark}`)

    setOriginInput(startName)
    setDestInput(destName)

    const originTuple = LANDMARKS['kondapur']!
    const destTuple = LANDMARKS[landmark]!

    const originCoords = { lat: originTuple[0], lng: originTuple[1] }
    const destCoords = { lat: destTuple[0], lng: destTuple[1] }

    setOrigin(originCoords)
    setDestination(destCoords)
    onSearch(originCoords, destCoords)
  }

  return (
    <div className="w-full p-5 bg-[#111827] text-white flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-[#1f2937] pb-3">
        <span className="text-lg">🔍</span>
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-200">
          {t('map.finder.title')}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('map.finder.from')}
          </label>
          <input
            type="text"
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            placeholder={t('map.finder.fromPlaceholder')}
            className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('map.finder.to')}
          </label>
          <input
            type="text"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            placeholder={t('map.finder.toPlaceholder')}
            className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] transition-colors"
          />
        </div>

        {errorMsg && (
          <div className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 p-2.5 rounded-lg font-medium leading-tight">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all duration-200 shadow-md ${
            isPending
              ? 'bg-[#f59e0b]/40 text-slate-900/60 cursor-not-allowed'
              : 'bg-[#f59e0b] hover:bg-[#d97706] text-slate-900 active:scale-95 cursor-pointer'
          }`}
        >
          {isPending ? t('map.finder.calculating') : `${t('map.finder.findButton')} →`}
        </button>
      </form>

      {/* Quick Areas */}
      <div className="mt-4 pt-4 border-t border-[#1f2937] space-y-2.5">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
          ── {t('map.finder.quickAreas')} ──
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t('map.areas.banjarahills'), key: 'banjarahills' },
            { label: t('map.areas.gachibowli'), key: 'gachibowli' },
            { label: t('map.areas.kondapur'), key: 'kondapur' },
            { label: t('map.areas.madhapur'), key: 'madhapur' },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleChipClick(chip.key)}
              className="text-[10px] font-semibold bg-[#1f2937] hover:bg-[#f59e0b]/20 hover:text-[#f59e0b] text-gray-300 px-3 py-1.5 rounded-full border border-[#2e3a52] transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
export default RouteSearchBar
