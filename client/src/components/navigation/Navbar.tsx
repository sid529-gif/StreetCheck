import { Link, useLocation } from 'react-router-dom'

export function Navbar() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="h-16 bg-[#0a0f1a] border-b border-[#1f2937] flex items-center justify-between px-6 sticky top-0 z-[1001]">
      {/* Left: Brand logo */}
      <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="bg-[#f59e0b] text-[#0a0f1a] h-9 w-9 rounded-lg flex items-center justify-center font-black text-base shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          SC
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-wider text-[#f59e0b] leading-tight">
            STREETCHECK
          </span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">
            HYD CIVIC SAFETY
          </span>
        </div>
      </Link>

      {/* Center: Navigation Links */}
      <div className="flex items-center gap-8 text-sm font-semibold">
        <Link
          to="/"
          className={`transition-colors hover:text-white ${
            isActive('/') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          Home
        </Link>
        <Link
          to="/map"
          className={`transition-colors hover:text-white ${
            isActive('/map') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          Map
        </Link>
        <Link
          to="/about"
          className={`transition-colors hover:text-white ${
            isActive('/about') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          About
        </Link>
      </div>

      {/* Right: CTA button */}
      <div>
        <Link
          to="/map"
          className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95"
        >
          Open Map
        </Link>
      </div>
    </nav>
  )
}
export default Navbar
