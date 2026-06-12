import { create } from 'zustand'

export interface LatLng {
  lat: number
  lng: number
}

export type AiProvider = 'server' | 'ollama' | 'byok'

interface SessionState {
  anonymousToken: string
  routeOrigin: LatLng | null
  routeDestination: LatLng | null
  aiProvider: AiProvider
  aiApiKey: string
  ollamaHost: string
  ollamaModel: string
  setOrigin: (origin: LatLng | null) => void
  setDestination: (destination: LatLng | null) => void
  setAiProvider: (provider: AiProvider) => void
  setAiApiKey: (key: string) => void
  setOllamaHost: (host: string) => void
  setOllamaModel: (model: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  anonymousToken: (() => {
    let token = localStorage.getItem('reporter_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('reporter_token', token)
    }
    return token
  })(),
  routeOrigin: null,
  routeDestination: null,
  aiProvider: (localStorage.getItem('ai_provider') as AiProvider) || 'server',
  aiApiKey: localStorage.getItem('ai_api_key') || '',
  ollamaHost: localStorage.getItem('ollama_host') || 'http://localhost:11434',
  ollamaModel: localStorage.getItem('ollama_model') || 'qwen3:1.7b',

  setOrigin: (routeOrigin) => set({ routeOrigin }),
  setDestination: (routeDestination) => set({ routeDestination }),
  setAiProvider: (aiProvider) => {
    localStorage.setItem('ai_provider', aiProvider)
    set({ aiProvider })
  },
  setAiApiKey: (aiApiKey) => {
    localStorage.setItem('ai_api_key', aiApiKey)
    set({ aiApiKey })
  },
  setOllamaHost: (ollamaHost) => {
    localStorage.setItem('ollama_host', ollamaHost)
    set({ ollamaHost })
  },
  setOllamaModel: (ollamaModel) => {
    localStorage.setItem('ollama_model', ollamaModel)
    set({ ollamaModel })
  },
}))

export default useSessionStore
