import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { api, type AppStats } from '../services/api.js'
import Navbar from '../components/navigation/Navbar.js'

export default function LandingPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AppStats>({
    segmentCount: 70124,
    activeReports: 12,
    safetyIndex: 0.76,
    lastRefreshed: new Date().toISOString(),
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    api
      .getStats()
      .then((data) => {
        setStats(data)
        setLoadingStats(false)
      })
      .catch((err) => {
        console.error('Failed to fetch stats:', err)
        setLoadingStats(false)
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a] text-white overflow-x-hidden font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping" />
            {t('landing.liveIntel')}
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none uppercase">
            {t('landing.heroTitle')} <br className="hidden md:inline" />
            {t('landing.heroTitleMid')} <br />
            <span className="text-[#f59e0b]">{t('landing.heroTitleSub')}</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
            <Trans i18nKey="landing.heroDesc">
              Google Maps shows the fastest route.{' '}
              <strong className="text-white">StreetCheck</strong> shows the safest one. Bypass
              waterlogged underpasses, dark streets, and pothole-ridden lanes.
            </Trans>
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/map"
              className="px-8 py-4 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-base transition-all duration-200 shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              {t('landing.openSafetyMap')}
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-[#111827] border border-[#1f2937] hover:bg-gray-800 text-gray-300 font-bold rounded-xl text-base transition-all duration-200 hover:-translate-y-0.5"
            >
              {t('landing.howItWorksLink')}
            </a>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-[#1f2937] pt-8 grid grid-cols-3 gap-6 max-w-xl">
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {loadingStats ? '...' : stats.segmentCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                {t('landing.stats.roadsScored')}
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-[#f59e0b] flex items-center gap-1.5">
                5{' '}
                <span className="text-xs font-semibold text-gray-400">
                  {t('landing.stats.layers')}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                {t('landing.stats.safetyLayers')}
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-[#10b981]">
                {loadingStats ? '...' : stats.activeReports} {t('landing.stats.active')}
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                {t('landing.stats.citizenHazards')}
              </div>
            </div>
          </div>
        </div>

        {/* Signature Element: Interactive/Animated Pulsing Grid Map */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[420px] aspect-square rounded-3xl bg-[#111827] border border-[#1f2937] p-6 shadow-2xl overflow-hidden group">
            {/* Shimmer background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#f59e0b]/5 via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] opacity-25" />

            <div className="relative h-full flex flex-col justify-between">
              {/* Fake Map Header */}
              <div className="flex justify-between items-center bg-[#0a0f1a]/80 backdrop-blur border border-[#1f2937] rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {t('landing.fakeMap.title')}
                  </span>
                </div>
                <span className="text-[10px] text-[#f59e0b] font-mono font-bold">
                  {t('landing.fakeMap.compositeActive')}
                </span>
              </div>

              {/* Pulsing Road Line Drawings */}
              <div className="flex-1 relative my-6">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background road network paths */}
                  <path
                    d="M10 20 H90 M10 50 H90 M10 80 H90 M30 10 V90 M70 10 V90"
                    stroke="#1f2937"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Pulsing Road Segments */}
                  {/* Road 1: Green Safe */}
                  <path
                    d="M10 20 H30"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                  />
                  {/* Road 2: Amber Caution */}
                  <path
                    d="M30 20 H70"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '2.5s' }}
                  />
                  {/* Road 3: Red Avoid */}
                  <path
                    d="M70 20 H90"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '2s' }}
                  />

                  {/* Verticals */}
                  <path
                    d="M30 20 V50"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '3.5s' }}
                  />
                  <path
                    d="M70 20 V80"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '1.8s' }}
                  />

                  {/* Center junction pulse */}
                  <circle
                    cx="30"
                    cy="50"
                    r="4"
                    fill="#10b981"
                    className="animate-ping opacity-75"
                  />
                  <circle cx="30" cy="50" r="3" fill="#10b981" />

                  {/* Hazard Spot */}
                  <circle
                    cx="70"
                    cy="50"
                    r="4"
                    fill="#ef4444"
                    className="animate-ping opacity-75"
                  />
                  <circle cx="70" cy="50" r="3" fill="#ef4444" />
                </svg>

                {/* Floating tooltips */}
                <div className="absolute top-[28%] left-[12%] bg-[#0a0f1a] border border-[#1f2937] rounded-lg px-2 py-1 text-[9px] font-bold shadow-lg">
                  Road No. 12: <span className="text-[#10b981]">84%</span>
                </div>
                <div className="absolute bottom-[28%] right-[12%] bg-[#0a0f1a] border border-[#1f2937] rounded-lg px-2 py-1 text-[9px] font-bold shadow-lg">
                  Tolichowki Flat: <span className="text-[#ef4444]">32%</span>
                </div>
              </div>

              {/* Mini-map Card Footer */}
              <div className="bg-[#0a0f1a]/60 border border-[#1f2937] rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-gray-400">{t('landing.fakeMap.hoverToInspect')}</span>
                <Link
                  to="/map"
                  className="text-[#f59e0b] hover:underline font-bold flex items-center gap-1"
                >
                  {t('landing.fakeMap.launchMap')} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: The 5 Layers */}
      <section className="bg-[#0b1329] border-y border-[#1f2937] py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black text-[#f59e0b] tracking-widest uppercase">
              {t('landing.features.preTitle')}
            </h2>
            <p className="text-3xl font-black uppercase text-white tracking-tight">
              {t('landing.features.title')}
            </p>
            <p className="text-sm text-gray-400">{t('landing.features.desc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card 1 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">💡</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  {t('landing.features.lighting.title')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('landing.features.lighting.desc')}
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-700 to-amber-400 w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>{t('landing.features.lighting.low')}</span>
                  <span>{t('landing.features.lighting.high')}</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🌊</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  {t('landing.features.flood.title')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('landing.features.flood.desc')}
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#0d9488] to-[#ef4444] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>{t('landing.features.flood.low')}</span>
                  <span>{t('landing.features.flood.high')}</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🛣️</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  {t('landing.features.surface.title')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('landing.features.surface.desc')}
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#ef4444] to-[#10b981] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>{t('landing.features.surface.low')}</span>
                  <span>{t('landing.features.surface.high')}</span>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🚶</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  {t('landing.features.walkability.title')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('landing.features.walkability.desc')}
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gray-600 via-violet-600 to-indigo-600 w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>{t('landing.features.walkability.low')}</span>
                  <span>{t('landing.features.walkability.high')}</span>
                </div>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">⚠️</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  {t('landing.features.accident.title')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('landing.features.accident.desc')}
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#10b981] via-amber-400 to-[#ef4444] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>{t('landing.features.accident.low')}</span>
                  <span>{t('landing.features.accident.high')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How it Works */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-4">
          <h2 className="text-xs font-black text-[#f59e0b] tracking-widest uppercase">
            {t('landing.howItWorks.preTitle')}
          </h2>
          <p className="text-3xl font-black uppercase text-white tracking-tight">
            {t('landing.howItWorks.title')}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Step 1 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              1
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">
              {t('landing.howItWorks.step1.title')}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              {t('landing.howItWorks.step1.desc')}
            </p>
          </div>

          {/* Connection arrow */}
          <div className="hidden lg:block text-2xl text-gray-600 font-bold">&rarr;</div>

          {/* Step 2 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              2
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">
              {t('landing.howItWorks.step2.title')}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              {t('landing.howItWorks.step2.desc')}
            </p>
          </div>

          {/* Connection arrow */}
          <div className="hidden lg:block text-2xl text-gray-600 font-bold">&rarr;</div>

          {/* Step 3 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              3
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">
              {t('landing.howItWorks.step3.title')}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              {t('landing.howItWorks.step3.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: CTA Strip */}
      <section className="bg-gradient-to-r from-[#f59e0b]/10 to-transparent border-t border-[#1f2937] py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">
              {t('landing.cta.title')}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{t('landing.cta.desc')}</p>
          </div>
          <Link
            to="/map"
            className="flex items-center gap-2 px-8 py-4 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-base transition-all duration-200 shadow-xl"
          >
            {t('landing.cta.button')} &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050912] border-t border-[#1f2937] py-8 text-center text-xs text-gray-500">
        {t('landing.footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  )
}
