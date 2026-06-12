import { useTranslation } from 'react-i18next'
import { SAFETY_COLOURS } from '../../services/safetyColours.js'

interface ScoreDisplayProps {
  score: number // value from 0.0 to 1.0
  band: 'green' | 'amber' | 'red'
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreDisplay({ score, band, size = 'md' }: ScoreDisplayProps) {
  const { t } = useTranslation()
  const scoreVal = Math.round(score * 100)
  const colors = SAFETY_COLOURS[band]

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      ring: 'w-10 h-10 text-xs',
      label: 'text-[9px]',
      score: 'text-sm font-black',
    },
    md: {
      container: 'gap-3',
      ring: 'w-14 h-14 text-sm',
      label: 'text-[10px]',
      score: 'text-lg font-black',
    },
    lg: {
      container: 'gap-4',
      ring: 'w-20 h-20 text-base',
      label: 'text-xs',
      score: 'text-2xl font-black',
    },
  }

  const currentSize = sizeClasses[size]

  // Circular progress calculation
  // Radius of circle = 24. Stroke width = 4. Circumference = 2 * PI * r = 150.8
  const radius = 24
  const strokeWidth = 4
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - score * circumference

  return (
    <div className={`flex items-center ${currentSize.container}`}>
      {/* SVG Circular Ring */}
      <div className={`relative flex items-center justify-center ${currentSize.ring}`}>
        <svg className="w-full h-full transform -rotate-95" viewBox="0 0 60 60">
          {/* Background circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            stroke={colors.hex}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute ${currentSize.score} text-white`}>{scoreVal}</span>
      </div>

      <div className="flex flex-col">
        <span className={`font-black uppercase tracking-wider ${colors.text} ${currentSize.label}`}>
          {t(`map.bands.${band}`)}
        </span>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {t('map.safetyIndex')}
        </span>
      </div>
    </div>
  )
}

export default ScoreDisplay
