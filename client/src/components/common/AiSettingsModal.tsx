import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore, type AiProvider } from '../../store/sessionStore.js'

interface AiSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
  const { t } = useTranslation()
  const store = useSessionStore()

  const [provider, setProvider] = useState<AiProvider>(store.aiProvider)
  const [apiKey, setApiKey] = useState(store.aiApiKey)
  const [ollamaHost, setOllamaHost] = useState(store.ollamaHost)
  const [ollamaModel, setOllamaModel] = useState(store.ollamaModel)

  if (!isOpen) return null

  const handleSave = () => {
    store.setAiProvider(provider)
    store.setAiApiKey(apiKey)
    store.setOllamaHost(ollamaHost)
    store.setOllamaModel(ollamaModel)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#1f2937] bg-[#0a0f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              {t('nav.aiSettings', { defaultValue: 'AI Configuration' })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Provider Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
              {t('nav.aiProvider', { defaultValue: 'AI Inference Provider' })}
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-4 py-3 text-xs text-white focus:border-[#f59e0b] focus:outline-none cursor-pointer"
            >
              <option value="server">Server Default (Claude / HF)</option>
              <option value="ollama">Local Inference (Ollama - Qwen)</option>
              <option value="byok">Bring Your Own Key (Anthropic API)</option>
            </select>
            <p className="text-[10px] text-gray-500 leading-normal">
              {provider === 'server' &&
                'Uses StreetCheck server APIs (Claude Vision & BART classifier).'}
              {provider === 'ollama' &&
                'Runs local inference on your machine via Ollama. Ensures 100% privacy.'}
              {provider === 'byok' &&
                'Uses your own Anthropic Claude token directly from the frontend.'}
            </p>
          </div>

          {/* Local Ollama Fields */}
          {provider === 'ollama' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                  Ollama Endpoint URL
                </label>
                <input
                  type="text"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  placeholder="e.g. http://localhost:11434"
                  className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                  Ollama Model
                </label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="e.g. qwen3:1.7b"
                  className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* BYOK Fields */}
          {provider === 'byok' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                Anthropic API Key (sk-ant-...)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your sk-ant- key"
                className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#f59e0b] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1f2937] bg-[#0a0f1a] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all border border-[#1f2937] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
export default AiSettingsModal
