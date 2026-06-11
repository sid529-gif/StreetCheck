export const SAFETY_COLOURS = {
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    hex: '#22c55e',
    label: 'Safe',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    hex: '#f59e0b',
    label: 'Caution',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    hex: '#ef4444',
    label: 'Avoid',
  },
} as const
