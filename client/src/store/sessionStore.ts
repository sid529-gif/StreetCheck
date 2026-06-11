import { create } from 'zustand'

export interface LatLng {
  lat: number
  lng: number
}

interface SessionState {
  anonymousToken: string
  routeOrigin: LatLng | null
  routeDestination: LatLng | null
  setOrigin: (origin: LatLng | null) => void
  setDestination: (destination: LatLng | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  anonymousToken: crypto.randomUUID(),
  routeOrigin: null,
  routeDestination: null,
  setOrigin: (routeOrigin) => set({ routeOrigin }),
  setDestination: (routeDestination) => set({ routeDestination }),
}))
