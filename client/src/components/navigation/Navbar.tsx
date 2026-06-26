import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { AiSettingsModal } from '../common/AiSettingsModal.js'

export function Navbar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => location.pathname === path

  const currentLanguage = i18n.language || 'en'

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  ]

  const activeLang = (languages.find((l) => currentLanguage.startsWith(l.code)) ||
    languages[0]) as {
    code: string
    name: string
    nativeName: string
  }

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setDropdownOpen(false)
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="h-16 bg-[#0a0f1a] border-b border-[#1f2937] flex items-center justify-between px-6 sticky top-0 z-[1001]">
      {/* Left: Brand logo */}
      <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="bg-[#f59e0b] text-[#0a0f1a] h-9 w-9 rounded-lg flex items-center justify-center font-black text-base shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          SC
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-wider text-[#f59e0b] leading-tight">
            {t('nav.brand')}
          </span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">
            {t('nav.subtitle')}
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
          {t('nav.home')}
        </Link>
        <Link
          to="/map"
          className={`transition-colors hover:text-white ${
            isActive('/map') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          {t('nav.map')}
        </Link>
        <Link
          to="/reviews"
          className={`transition-colors hover:text-white ${
            isActive('/reviews') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          Reviews
        </Link>
        <Link
          to="/about"
          className={`transition-colors hover:text-white ${
            isActive('/about') ? 'text-[#f59e0b]' : 'text-gray-400'
          }`}
        >
          {t('nav.about')}
        </Link>
      </div>

      {/* Right: CTA button & Language Selector */}
      <div className="flex items-center gap-4">
        {/* Language selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] hover:border-[#f59e0b]/45 text-gray-300 hover:text-white px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <span>🌐</span>
            <span>{activeLang.nativeName}</span>
            <span
              className={`text-[8px] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            >
              ▼
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-[#111827] border border-[#1f2937] rounded-xl shadow-2xl overflow-hidden z-[1002] animate-in fade-in slide-in-from-top-2 duration-150">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-800 cursor-pointer ${
                    activeLang.code === lang.code
                      ? 'text-[#f59e0b] font-extrabold bg-[#f59e0b]/5'
                      : 'text-gray-300'
                  }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Config Button */}
        <button
          onClick={() => setAiSettingsOpen(true)}
          type="button"
          className="flex items-center gap-1.5 bg-[#111827] border border-[#1f2937] hover:border-[#f59e0b]/45 text-gray-300 hover:text-white px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <span>🤖</span>
          <span className="hidden sm:inline">AI Config</span>
        </button>

        <Link
          to="/map"
          className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95"
        >
          {t('nav.openMap')}
        </Link>
      </div>

      <AiSettingsModal isOpen={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </nav>
  )
}
export default Navbar
