import { create } from 'zustand'
import type { HazardType } from '@streetcheck/shared'

export interface Viewport {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface MapFilters {
  minScore: number
  hazardTypes: HazardType[]
}

export type ActiveLayer = 'composite' | 'lighting' | 'flood' | 'surface' | 'walkability'

interface MapState {
  viewport: Viewport | null
  selectedSegmentId: string | null
  activeFilters: MapFilters
  activeLayer: ActiveLayer
  setViewport: (viewport: Viewport | null) => void
  setSelectedSegment: (segmentId: string | null) => void
  setFilters: (filters: Partial<MapFilters>) => void
  setActiveLayer: (layer: ActiveLayer) => void
}

export const useMapStore = create<MapState>((set) => ({
  viewport: null,
  selectedSegmentId: null,
  activeFilters: {
    minScore: 0,
    hazardTypes: [],
  },
  activeLayer: 'composite',
  setViewport: (viewport) => set({ viewport }),
  setSelectedSegment: (selectedSegmentId) => set({ selectedSegmentId }),
  setFilters: (filters) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    })),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
}))
