import { useTranslation } from 'react-i18next'
import { type ActiveLayer, useMapStore } from '../../store/mapStore.js'

export function MapLegend() {
  const { t } = useTranslation()
  const activeLayer = useMapStore((state) => state.activeLayer)

  // Define the legend configurations for each active layer type
  const getLegendData = (layer: ActiveLayer) => {
    const proximityItems = [
      {
        color: '#ef4444',
        label: '0–45%',
        desc: 'Low Proximity / Absent',
      },
      {
        color: '#eab308',
        label: '46–75%',
        desc: 'Moderate Proximity',
      },
      {
        color: '#22c55e',
        label: '76–100%',
        desc: 'High Proximity / Present',
      },
    ]

    switch (layer) {
      case 'composite':
        return {
          title: t('map.layers.all', { defaultValue: 'Overall Safety' }),
          items: [
            {
              color: '#ef4444',
              label: '0–45%',
              desc: t('map.legend.unsafe', { defaultValue: 'Avoid' }),
            },
            {
              color: '#eab308',
              label: '46–75%',
              desc: t('map.legend.caution', { defaultValue: 'Caution' }),
            },
            {
              color: '#22c55e',
              label: '76–100%',
              desc: t('map.legend.safe', { defaultValue: 'Safe' }),
            },
          ],
        }
      case 'school':
        return { title: 'School Proximity', items: proximityItems }
      case 'hospital':
        return { title: 'Hospital Proximity', items: proximityItems }
      case 'park':
        return { title: 'Park Proximity', items: proximityItems }
      case 'bus_stop':
        return { title: 'Bus Stop Proximity', items: proximityItems }
      case 'footpath':
        return {
          title: 'Footpath Presence',
          items: [
            { color: '#ef4444', label: '0–45%', desc: 'No Footpath' },
            { color: '#eab308', label: '46–75%', desc: 'Partial Footpath' },
            { color: '#22c55e', label: '76–100%', desc: 'Full Footpath' },
          ],
        }
      default:
        return null
    }
  }

  const legend = getLegendData(activeLayer)
  if (!legend) return null

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 max-w-[260px] text-white select-none transition-all hover:border-gray-700">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-[#1f2937] pb-1.5 flex items-center justify-between">
        <span>{legend.title}</span>
        <span className="text-[8px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase">
          Legend
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {legend.items.map((item, index) => (
          <div key={index} className="flex items-center gap-2.5">
            {/* Color indicator */}
            <div
              className="w-3.5 h-3.5 rounded-md flex-shrink-0 shadow-sm border border-black/10"
              style={{ backgroundColor: item.color }}
            />
            {/* Range / Text label */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-extrabold text-gray-200 leading-none">
                {item.desc}
              </span>
              <span className="text-[8px] text-gray-500 font-mono mt-0.5 font-bold">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default MapLegend
