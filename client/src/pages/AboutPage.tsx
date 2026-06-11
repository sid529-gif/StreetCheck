import Navbar from '../components/navigation/Navbar.js'

export default function AboutPage() {
  const formulaWeights = [
    {
      name: 'Lighting Score',
      weight: 30,
      color: 'bg-blue-500',
      desc: 'Street-by-street streetlight coverage and tag validations',
    },
    {
      name: 'Accident Safety (1 - rate)',
      weight: 25,
      color: 'bg-green-500',
      desc: 'Normalized historical accident black spot density mapping',
    },
    {
      name: 'Flood Safety (1 - risk)',
      weight: 20,
      color: 'bg-teal-500',
      desc: 'Monsoon waterlogging zones, drains, and low points',
    },
    {
      name: 'Surface Quality',
      weight: 15,
      color: 'bg-amber-500',
      desc: 'Pothole frequencies, road surface materials, and cracks',
    },
    {
      name: 'Walkability Score',
      weight: 10,
      color: 'bg-indigo-500',
      desc: 'Footpath presence, walk widths, and sidewalk coverage',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 space-y-12 w-full">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest">
            Swecha Hackathon 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
            About StreetCheck
          </h1>
          <p className="text-base text-gray-400 leading-relaxed">
            StreetCheck is Hyderabad&apos;s civic road safety intelligence platform. Similar to
            CrystalRoof in the UK, it evaluates every road segment in the city on five key safety
            dimensions to empower citizens to make safer, better-informed navigation decisions.
          </p>
        </div>

        {/* Scoring Model Visualized */}
        <section className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-8">
          <div>
            <h2 className="text-lg font-black uppercase text-[#f59e0b] tracking-wider">
              Safety Scoring Model
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Safety scores are calculated dynamically per road segment based on locked weights:
            </p>
          </div>

          <div className="space-y-5">
            {formulaWeights.map((w, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <div className="font-extrabold text-white uppercase tracking-wide">{w.name}</div>
                  <div className="font-mono font-bold text-[#f59e0b]">{w.weight}% weight</div>
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
            <span>Formula Lock: SCORING_VERSION v1</span>
            <span className="text-[#f59e0b]">
              safety_score = 0.3L + 0.25A + 0.20F + 0.15S + 0.1W
            </span>
          </div>
        </section>

        {/* Data Sources */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-4">
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              Municipal Data Sources
            </h3>
            <ul className="space-y-3 text-xs text-gray-400 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-white">OpenStreetMap:</strong> Road hierarchies, lighting
                nodes, and sidewalk infrastructure.
              </li>
              <li>
                <strong className="text-white">HYDRAA:</strong> Monsoon waterlogging hotspots and
                lake-overflow zones.
              </li>
              <li>
                <strong className="text-white">MoRTH:</strong> High-risk traffic black spots and
                historical accident data.
              </li>
              <li>
                <strong className="text-white">Telangana Open Data Portal:</strong> Streetlight
                locations and drainage coordinates.
              </li>
            </ul>
          </div>

          <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 space-y-4">
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              Important Exclusions &amp; Safety
            </h3>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 text-gray-400 space-y-2">
                <p className="font-extrabold uppercase text-[#ef4444] text-[10px] tracking-wider">
                  ⚠️ STRICT NON-NEGOTIABLES
                </p>
                <p className="text-[11px]">
                  <strong>No Crime or Policing Data:</strong> StreetCheck does not collect, model,
                  or discuss policing data, crime statistics, or socioeconomic factors.
                </p>
                <p className="text-[11px]">
                  <strong>Strictly Anonymous:</strong> Reports are logged anonymously using a
                  locally generated token. No Personal Identifiable Information (PII) is tracked.
                </p>
              </div>
              <p>
                Calculations are restricted to the Hyderabad metropolitan region only. AI summaries
                and routing insights are powered by context-locked Anthropic Claude APIs.
              </p>
            </div>
          </div>
        </section>

        {/* Built With */}
        <section className="text-center text-xs text-gray-500 border-t border-[#1f2937] pt-8 space-y-2">
          <div>
            Built with <strong className="text-white">React 18</strong> ·{' '}
            <strong className="text-white">Vite</strong> ·{' '}
            <strong className="text-white">Tailwind CSS</strong> ·{' '}
            <strong className="text-white">PostGIS</strong> ·{' '}
            <strong className="text-white">Claude AI</strong>
          </div>
          <div>Inspired by the CrystalRoof UK safety platform. Swecha Hackathon 2026.</div>
        </section>
      </main>
    </div>
  )
}
