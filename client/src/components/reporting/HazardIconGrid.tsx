import type { HazardType } from '@streetcheck/shared'
import { useTranslation } from 'react-i18next'

interface HazardIconGridProps {
  selectedType: HazardType | null
  onChange: (type: HazardType) => void
  aiSuggestedType?: HazardType | null
}

interface HazardOption {
  type: HazardType
  label: string
  emoji: string
}

const HAZARDS: HazardOption[] = [
  {
    type: 'pothole',
    label: 'Pothole',
    emoji: '🕳️',
  },
  {
    type: 'broken_streetlight',
    label: 'Light',
    emoji: '💡',
  },
  {
    type: 'waterlogging',
    label: 'Flood',
    emoji: '🌊',
  },
  {
    type: 'construction_debris',
    label: 'Build',
    emoji: '🏗️',
  },
  {
    type: 'open_manhole',
    label: 'Debris',
    emoji: '🗑️',
  },
  {
    type: 'stray_animals',
    label: 'Animal',
    emoji: '🐄',
  },
]

export function HazardIconGrid({ selectedType, onChange, aiSuggestedType }: HazardIconGridProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
        {t('map.reportModal.see')}
      </label>
      <div className="grid grid-cols-3 gap-3 md:flex md:flex-wrap md:justify-center">
        {HAZARDS.map((h) => {
          const isSelected = selectedType === h.type
          const isAiSuggested = aiSuggestedType === h.type

          return (
            <button
              key={h.type}
              type="button"
              onClick={() => onChange(h.type)}
              className={`relative flex flex-col items-center justify-center w-full h-20 md:w-[86px] md:h-[86px] rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b] scale-[1.03]'
                  : 'border-[#1f2937] bg-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-1">{h.emoji}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full">
                {t(`map.hazards.${h.type}`, { defaultValue: h.label })}
              </span>

              {isAiSuggested && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-[#f59e0b] text-[8px] items-center justify-center text-[#0a0f1a] font-extrabold border border-[#111827]">
                    {t('map.reportModal.suggested', { defaultValue: 'AI' })}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default HazardIconGrid
