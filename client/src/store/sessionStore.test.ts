import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './sessionStore.js'

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      routeOrigin: null,
      routeDestination: null,
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
})
