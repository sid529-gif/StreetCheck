import { HashRouter, Routes, Route } from 'react-router-dom'

// Placeholder pages — replaced in Phase 3+
function MapPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">StreetCheck</h1>
        <p className="text-[var(--text-muted)]">Civic road safety intelligence for Hyderabad</p>
        <div className="mt-6 flex gap-3 justify-center">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-safety-green text-white">
            ● Green — Safe
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-safety-amber text-white">
            ● Amber — Caution
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-safety-red text-white">
            ● Red — Avoid
          </span>
        </div>
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          Phase 0 scaffold — map loads in Phase 3
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </HashRouter>
  )
}
