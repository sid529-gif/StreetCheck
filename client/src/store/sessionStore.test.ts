import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './sessionStore.js'

describe('sessionStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.setState({
      routeOrigin: null,
      routeDestination: null,
      aiProvider: 'server',
      aiApiKey: '',
      ollamaHost: 'http://localhost:11434',
      ollamaModel: 'qwen3:1.7b',
    })
  })

  it('should generate an anonymous token on load', () => {
    const token = useSessionStore.getState().anonymousToken
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBe(36) // UUID length
  })

  it('should set origin and destination', () => {
    const origin = { lat: 17.462, lng: 78.356 }
    const dest = { lat: 17.44, lng: 78.348 }

    useSessionStore.getState().setOrigin(origin)
    useSessionStore.getState().setDestination(dest)

    expect(useSessionStore.getState().routeOrigin).toEqual(origin)
    expect(useSessionStore.getState().routeDestination).toEqual(dest)
  })

  it('should clear origin and destination', () => {
    useSessionStore.getState().setOrigin({ lat: 17.462, lng: 78.356 })
    useSessionStore.getState().setOrigin(null)
    expect(useSessionStore.getState().routeOrigin).toBeNull()

    useSessionStore.getState().setDestination({ lat: 17.44, lng: 78.348 })
    useSessionStore.getState().setDestination(null)
    expect(useSessionStore.getState().routeDestination).toBeNull()
  })

  it('should set AI provider and persist to localStorage', () => {
    useSessionStore.getState().setAiProvider('byok')
    expect(useSessionStore.getState().aiProvider).toBe('byok')
    expect(localStorage.getItem('ai_provider')).toBe('byok')
  })

  it('should set AI API key and persist to localStorage', () => {
    useSessionStore.getState().setAiApiKey('sk-test-key-123')
    expect(useSessionStore.getState().aiApiKey).toBe('sk-test-key-123')
    expect(localStorage.getItem('ai_api_key')).toBe('sk-test-key-123')
  })

  it('should set Ollama host and persist to localStorage', () => {
    useSessionStore.getState().setOllamaHost('http://localhost:9999')
    expect(useSessionStore.getState().ollamaHost).toBe('http://localhost:9999')
    expect(localStorage.getItem('ollama_host')).toBe('http://localhost:9999')
  })

  it('should set Ollama model and persist to localStorage', () => {
    useSessionStore.getState().setOllamaModel('llama3:8b')
    expect(useSessionStore.getState().ollamaModel).toBe('llama3:8b')
    expect(localStorage.getItem('ollama_model')).toBe('llama3:8b')
  })

  it('should switch AI provider back to server', () => {
    useSessionStore.getState().setAiProvider('ollama')
    useSessionStore.getState().setAiProvider('server')
    expect(useSessionStore.getState().aiProvider).toBe('server')
    expect(localStorage.getItem('ai_provider')).toBe('server')
  })
})
