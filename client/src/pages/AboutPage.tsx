import { Trans, useTranslation } from 'react-i18next'
import Navbar from '../components/navigation/Navbar.js'

export default function AboutPage() {
  const { t } = useTranslation()

  const formulaWeights = [
    {
      name: t('about.model.lighting.name'),
      weight: 30,
      color: 'bg-blue-500',
      desc: t('about.model.lighting.desc'),
    },
    {
      name: t('about.model.accident.name'),
      weight: 25,
      color: 'bg-green-500',
      desc: t('about.model.accident.desc'),
    },
    {
      name: t('about.model.flood.name'),
      weight: 20,
      color: 'bg-teal-500',
      desc: t('about.model.flood.desc'),
    },
    {
      name: t('about.model.surface.name'),
      weight: 15,
      color: 'bg-amber-500',
      desc: t('about.model.surface.desc'),
    },
    {
      name: t('about.model.walkability.name'),
      weight: 10,
      color: 'bg-indigo-500',
      desc: t('about.model.walkability.desc'),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 space-y-12 w-full">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest">
            {t('about.preTitle')}
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-base text-gray-400 leading-relaxed">{t('about.desc')}</p>
        </div>

        {/* Scoring Model Visualized */}
        <section className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-8">
          <div>
            <h2 className="text-lg font-black uppercase text-[#f59e0b] tracking-wider">
              {t('about.model.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{t('about.model.desc')}</p>
          </div>

          <div className="space-y-5">
            {formulaWeights.map((w, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <div className="font-extrabold text-white uppercase tracking-wide">{w.name}</div>
                  <div className="font-mono font-bold text-[#f59e0b]">
                    {t('about.model.weight', { weight: w.weight })}
                  </div>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${w.color} transition-all duration-1000`}
                    style={{ width: `${w.weight}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500">{w.desc}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#1f2937] pt-6 flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span>{t('about.model.formulaLock')}</span>
            <span className="text-[#f59e0b]">
              safety_score = 0.3L + 0.25A + 0.20F + 0.15S + 0.1W
            </span>
          </div>
        </section>

        {/* Data Sources */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-4">
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              {t('about.sources.title')}
            </h3>
            <ul className="space-y-3 text-xs text-gray-400 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-white">OpenStreetMap:</strong> {t('about.sources.osm')}
              </li>
              <li>
                <strong className="text-white">HYDRAA:</strong> {t('about.sources.hydraa')}
              </li>
              <li>
                <strong className="text-white">MoRTH:</strong> {t('about.sources.morth')}
              </li>
              <li>
                <strong className="text-white">Telangana Open Data Portal:</strong>{' '}
                {t('about.sources.tgPortal')}
              </li>
            </ul>
          </div>

          <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-4">
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              {t('about.safety.title')}
            </h3>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 text-gray-400 space-y-2">
                <p className="font-extrabold uppercase text-[#ef4444] text-[10px] tracking-wider">
                  ⚠️ {t('about.safety.nonNegotiable')}
                </p>
                <p className="text-[11px]">
                  <strong>{t('about.safety.noCrimeTitle')}</strong> {t('about.safety.noCrimeDesc')}
                </p>
                <p className="text-[11px]">
                  <strong>{t('about.safety.anonTitle')}</strong> {t('about.safety.anonDesc')}
                </p>
              </div>
              <p>{t('about.safety.exclusionNotes')}</p>
            </div>
          </div>
        </section>

        {/* Built With */}
        <section className="text-center text-xs text-gray-500 border-t border-[#1f2937] pt-8 space-y-2">
          <div>
            <Trans i18nKey="about.footer.builtWith">
              Built with <strong className="text-white">React 18</strong> ·{' '}
              <strong className="text-white">Vite</strong> ·{' '}
              <strong className="text-white">Tailwind CSS</strong> ·{' '}
              <strong className="text-white">PostGIS</strong> ·{' '}
              <strong className="text-white">Claude AI</strong>
            </Trans>
          </div>
          <div>{t('about.footer.inspiration')}</div>
        </section>
      </main>
    </div>
  )
}
