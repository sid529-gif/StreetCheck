import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AppStats } from '../services/api.js'
import Navbar from '../components/navigation/Navbar.js'

export default function LandingPage() {
  const [stats, setStats] = useState<AppStats>({
    segmentCount: 70124,
    activeReports: 12,
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
            Live Hyderabad Intelligence
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none uppercase">
            Road Safety <br className="hidden md:inline" />
            Intelligence <br />
            <span className="text-[#f59e0b]">For Hyderabad</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
            Google Maps shows the fastest route. <strong className="text-white">StreetCheck</strong>{' '}
            shows the safest one. Bypass waterlogged underpasses, dark streets, and pothole-ridden
            lanes.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/map"
              className="px-8 py-4 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-base transition-all duration-200 shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Open Safety Map
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-[#111827] border border-[#1f2937] hover:bg-gray-800 text-gray-300 font-bold rounded-xl text-base transition-all duration-200 hover:-translate-y-0.5"
            >
              How it works ↓
            </a>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-[#1f2937] pt-8 grid grid-cols-3 gap-6 max-w-xl">
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {loadingStats ? '...' : stats.segmentCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                Roads Scored
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-[#f59e0b] flex items-center gap-1.5">
                5 <span className="text-xs font-semibold text-gray-400">layers</span>
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                Safety Layers
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-[#10b981]">
                {loadingStats ? '...' : stats.activeReports} active
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                Citizen Hazards
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
                    Jubilee Hills Heatmap
                  </span>
                </div>
                <span className="text-[10px] text-[#f59e0b] font-mono font-bold">
                  Composite Active
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
                <span className="text-gray-400">Hover elements to inspect details</span>
                <Link
                  to="/map"
                  className="text-[#f59e0b] hover:underline font-bold flex items-center gap-1"
                >
                  Launch Map &rarr;
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
              Multidimensional Scores
            </h2>
            <p className="text-3xl font-black uppercase text-white tracking-tight">
              Safety Beyond Just Routing
            </p>
            <p className="text-sm text-gray-400">
              Unlike generic maps, StreetCheck evaluates every city street along five distinct
              safety verticals derived from verified municipal, geo, and crowd-sourced databases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card 1 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">💡</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">Lighting</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Illumination density and network lighting statuses mapped from OpenStreetMap tags.
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-700 to-amber-400 w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>Dark</span>
                  <span>Well Lit</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🌊</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Flood Risk
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Vulnerability mapping derived from HYDRAA reports and low-lying stormwater logs.
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#0d9488] to-[#ef4444] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>Low Risk</span>
                  <span>High Risk</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🛣️</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Road Surface
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Presence of potholes, broken concrete, or severe street cracking and municipal
                  logs.
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#ef4444] to-[#10b981] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>Severe Potholes</span>
                  <span>Smooth</span>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">🚶</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Walkability
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Paved sidewalks, clear pedestrian curbs, and footpath width coverage indicators.
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gray-600 via-violet-600 to-indigo-600 w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>No Footpath</span>
                  <span>Premium Sidewalk</span>
                </div>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="text-3xl">⚠️</div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Accident Rate
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Historical accident hotspots compiled from MoRTH databases and black-spot
                  coordinates.
                </p>
              </div>
              <div className="mt-6">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#10b981] via-amber-400 to-[#ef4444] w-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                  <span>Zero Crashes</span>
                  <span>High Accident</span>
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
            3 Simple Steps
          </h2>
          <p className="text-3xl font-black uppercase text-white tracking-tight">
            How StreetCheck Operates
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Step 1 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              1
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">View Heatmap</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              See Hyderabad roads color-coded live on our Leaflet map based on multi-dimensional
              safety scores.
            </p>
          </div>

          {/* Connection arrow */}
          <div className="hidden lg:block text-2xl text-gray-600 font-bold">&rarr;</div>

          {/* Step 2 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              2
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">Compare Routes</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              Get fastest vs safest paths calculated side-by-side using real-time graphs and Claude
              AI explanations.
            </p>
          </div>

          {/* Connection arrow */}
          <div className="hidden lg:block text-2xl text-gray-600 font-bold">&rarr;</div>

          {/* Step 3 */}
          <div className="flex-1 w-full text-center p-8 bg-[#111827] border border-[#1f2937] rounded-3xl relative">
            <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-black text-xl mx-auto mb-6">
              3
            </div>
            <h3 className="text-lg font-extrabold uppercase text-white mb-2">Report Hazard</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
              Tap directly on the map to flag broken lights, waterlogging, or potholed roads
              instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: CTA Strip */}
      <section className="bg-gradient-to-r from-[#f59e0b]/10 to-transparent border-t border-[#1f2937] py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">
              Hyderabad&apos;s roads, scored for safety.
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Open the safety map, select your route, and navigate the city with peace of mind.
            </p>
          </div>
          <Link
            to="/map"
            className="flex items-center gap-2 px-8 py-4 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-base transition-all duration-200 shadow-xl"
          >
            Open Safety Map &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050912] border-t border-[#1f2937] py-8 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} StreetCheck Hyderabad. Built for the Swecha Hackathon
        2026. Anonymous &amp; PII-Free.
      </footer>
    </div>
  )
}
