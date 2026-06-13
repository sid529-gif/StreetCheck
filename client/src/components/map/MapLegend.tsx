import { useTranslation } from 'react-i18next'
import { useMapStore, type ActiveLayer } from '../../store/mapStore.js'

export function MapLegend() {
  const { t } = useTranslation()
  const activeLayer = useMapStore((state) => state.activeLayer)

  // Define the legend configurations for each active layer type
  const getLegendData = (layer: ActiveLayer) => {
    switch (layer) {
      case 'composite':
        return {
          title: t('map.layers.all', { defaultValue: 'Overall Safety' }),
          items: [
            {
              color: '#991b1b',
              label: '0-20%',
              desc: t('map.legend.veryUnsafe', { defaultValue: 'Critical' }),
            },
            {
              color: '#ef4444',
              label: '21-40%',
              desc: t('map.legend.unsafe', { defaultValue: 'Unsafe' }),
            },
            {
              color: '#f97316',
              label: '41-60%',
              desc: t('map.legend.caution', { defaultValue: 'Caution' }),
            },
            {
              color: '#eab308',
              label: '61-75%',
              desc: t('map.legend.fair', { defaultValue: 'Fair' }),
            },
            {
              color: '#4ade80',
              label: '76-90%',
              desc: t('map.legend.safe', { defaultValue: 'Safe' }),
            },
            {
              color: '#15803d',
              label: '91-100%',
              desc: t('map.legend.verySafe', { defaultValue: 'Very Safe' }),
            },
          ],
        }
      case 'lighting':
        return {
          title: t('map.layers.lighting', { defaultValue: 'Lighting Quality' }),
          items: [
            {
              color: '#ef4444',
              label: '0-40%',
              desc: t('map.legend.dark', { defaultValue: 'Dark Zones' }),
            },
            {
              color: '#eab308',
              label: '41-75%',
              desc: t('map.legend.partial', { defaultValue: 'Dimly Lit' }),
            },
            {
              color: '#22c55e',
              label: '76-100%',
              desc: t('map.legend.wellLit', { defaultValue: 'Well Lit' }),
            },
          ],
        }
      case 'flood':
        return {
          title: t('map.layers.flood', { defaultValue: 'Historical Flood Risk' }),
          items: [
            {
              color: '#22c55e',
              label: '0-20%',
              desc: t('map.legend.lowRisk', { defaultValue: 'Low Risk' }),
            },
            {
              color: '#eab308',
              label: '21-50%',
              desc: t('map.legend.medRisk', { defaultValue: 'Moderate Risk' }),
            },
            {
              color: '#ef4444',
              label: '51-80%',
              desc: t('map.legend.highRisk', { defaultValue: 'High Risk' }),
            },
            {
              color: '#991b1b',
              label: '81-100%',
              desc: t('map.legend.extremeRisk', { defaultValue: 'Severe Risk' }),
            },
          ],
        }
      case 'surface':
        return {
          title: t('map.layers.surface', { defaultValue: 'Road Surface Quality' }),
          items: [
            {
              color: '#ef4444',
              label: '0-25%',
              desc: t('map.legend.damaged', { defaultValue: 'Damaged / Potholes' }),
            },
            {
              color: '#f97316',
              label: '26-50%',
              desc: t('map.legend.poorSurface', { defaultValue: 'Poor / Uneven' }),
            },
            {
              color: '#eab308',
              label: '51-75%',
              desc: t('map.legend.fairSurface', { defaultValue: 'Fair / Satisfactory' }),
            },
            {
              color: '#22c55e',
              label: '76-100%',
              desc: t('map.legend.smooth', { defaultValue: 'Smooth Asphalt' }),
            },
          ],
        }
      case 'walkability':
        return {
          title: t('map.layers.walkability', { defaultValue: 'Pedestrian Walkability' }),
          items: [
            {
              color: '#ef4444',
              label: '0-25%',
              desc: t('map.legend.noFootpath', { defaultValue: 'No Sidewalk' }),
            },
            {
              color: '#f97316',
              label: '26-50%',
              desc: t('map.legend.poorWalk', { defaultValue: 'Obstructions / Narrow' }),
            },
            {
              color: '#eab308',
              label: '51-75%',
              desc: t('map.legend.avgWalk', { defaultValue: 'Average Sidewalk' }),
            },
            {
              color: '#22c55e',
              label: '76-90%',
              desc: t('map.legend.goodWalk', { defaultValue: 'Good / Clear' }),
            },
            {
              color: '#15803d',
              label: '91-100%',
              desc: t('map.legend.excellentWalk', { defaultValue: 'Premium Footpath' }),
            },
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
