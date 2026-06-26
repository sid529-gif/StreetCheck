import type { HazardType } from '@streetcheck/shared'
import { create } from 'zustand'

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

export type ActiveLayer = 'composite' | 'school' | 'hospital' | 'park' | 'bus_stop' | 'footpath'

interface MapState {
  viewport: Viewport | null
  selectedSegmentId: string | null
  selectedAreaName: string | null
  activeFilters: MapFilters
  activeLayer: ActiveLayer
  setViewport: (viewport: Viewport | null) => void
  setSelectedSegment: (segmentId: string | null) => void
  setSelectedAreaName: (areaName: string | null) => void
  setFilters: (filters: Partial<MapFilters>) => void
  setActiveLayer: (layer: ActiveLayer) => void
}

export const useMapStore = create<MapState>((set) => ({
  viewport: null,
  selectedSegmentId: null,
  selectedAreaName: null,
  activeFilters: {
    minScore: 0,
    hazardTypes: [],
  },
  activeLayer: 'composite',
  setViewport: (viewport) => set({ viewport }),
  setSelectedSegment: (selectedSegmentId) =>
    set((state) => ({
      selectedSegmentId,
      selectedAreaName: selectedSegmentId ? null : state.selectedAreaName,
    })),
  setSelectedAreaName: (selectedAreaName) =>
    set((state) => ({
      selectedAreaName,
      selectedSegmentId: selectedAreaName ? null : state.selectedSegmentId,
    })),
  setFilters: (filters) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    })),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
}))
