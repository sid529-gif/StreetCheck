import Navbar from '../components/navigation/Navbar.js'

export default function AboutPage() {
  const formulaWeights = [
    {
      name: 'School Proximity',
      weight: 25,
      color: 'bg-blue-500',
      desc: 'Proximity index to educational institutions within the neighborhood.',
    },
    {
      name: 'Hospital Proximity',
      weight: 25,
      color: 'bg-emerald-500',
      desc: 'Proximity to clinics, emergency rooms, and medical centers.',
    },
    {
      name: 'Park Proximity',
      weight: 20,
      color: 'bg-teal-500',
      desc: 'Access to parks, playgrounds, and recreational public spaces.',
    },
    {
      name: 'Bus Stop Proximity',
      weight: 15,
      color: 'bg-amber-500',
      desc: 'Convenient proximity to public transit stops and transit terminals.',
    },
    {
      name: 'Footpath Presence',
      weight: 15,
      color: 'bg-indigo-500',
      desc: 'Coverage density of paved pedestrian sidewalks and dedicated footways.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 space-y-10 w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest">
            Swecha Hackathon 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
            About StreetCheck
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
            StreetCheck is Hyderabad&apos;s civic safety intelligence platform. Built on the Swecha
            OpenStreetMap (OSM) dataset, it evaluates city neighborhoods across 5 core
            infrastructure indicators to help citizens plan safer, smarter routes.
          </p>
        </div>

        {/* Scoring Model Details */}
        <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-base font-black uppercase text-[#f59e0b] tracking-wider">
              Safety Scoring Model (v3)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Every road segment and hotspot safety score is computed using the following locked
              weights:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Sliders */}
            <div className="space-y-4">
              {formulaWeights.map((w, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-extrabold text-gray-200">{w.name}</span>
                    <span className="font-mono font-bold text-[#f59e0b]">{w.weight}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${w.color} transition-all duration-1000`}
                      style={{ width: `${w.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Description list */}
            <div className="space-y-3 justify-center flex flex-col">
              {formulaWeights.map((w, i) => (
                <div key={i} className="text-xs">
                  <span className="font-bold text-white block">{w.name}</span>
                  <span className="text-[11px] text-gray-400">{w.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formula banner */}
          <div className="border-t border-[#1f2937] pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-gray-500 gap-2">
            <span>Formula Lock: SCORING_VERSION v3</span>
            <span className="text-[#f59e0b] font-bold text-xs bg-gray-900/60 px-3 py-1.5 rounded-lg border border-[#1f2937]">
              safety_score = 0.25 × School + 0.25 × Hospital + 0.20 × Park + 0.15 × BusStop + 0.15 ×
              Footpath
            </span>
          </div>
        </section>

        {/* Data & Constitutional Guidelines */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              Municipal Data Sources
            </h3>
            <ul className="space-y-2 text-xs text-gray-400 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-white">OpenStreetMap (Swecha):</strong> Base road networks,
                nodes, and transit infrastructure tags.
              </li>
              <li>
                <strong className="text-white">HYDRAA:</strong> Low-lying waterlogging records &
                drainage safety logs.
              </li>
              <li>
                <strong className="text-white">MoRTH:</strong> Historical accident spot statistics.
              </li>
              <li>
                <strong className="text-white">Telangana Open Data Portal:</strong> Ward boundaries
                & green spaces metadata.
              </li>
            </ul>
          </div>

          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-black uppercase text-white tracking-wide text-rose-500">
              Constitutional Guidelines
            </h3>
            <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-1">
                <p className="font-extrabold uppercase text-rose-500 text-[9px] tracking-wider">
                  ⚠️ Safety Exclusion Principles
                </p>
                <p className="text-[11px]">
                  <strong>No Crime/Policing Data:</strong> StreetCheck does not record, use, or
                  display policing records, crime stats, or demographic indicators.
                </p>
                <p className="text-[11px]">
                  <strong>100% Anonymous Reporting:</strong> Citizen hazard reporting is fully
                  anonymous and PII-free; tokens are generated locally and stored on the device.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center text-xs text-gray-600 border-t border-[#1f2937] pt-6">
          <div>
            Built with <strong className="text-gray-400">React 18</strong> ·{' '}
            <strong className="text-gray-400">Vite</strong> ·{' '}
            <strong className="text-gray-400">Tailwind CSS</strong> ·{' '}
            <strong className="text-gray-400">PostGIS</strong> ·{' '}
            <strong className="text-gray-400">Claude AI</strong>
          </div>
          <div className="mt-1">Designed for public safety and civic awareness.</div>
        </section>
      </main>
    </div>
  )
}
