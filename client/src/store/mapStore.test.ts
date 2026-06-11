import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from './mapStore.js'

describe('mapStore', () => {
  beforeEach(() => {
    useMapStore.setState({
      viewport: null,
      selectedSegmentId: null,
      activeFilters: { minScore: 0, hazardTypes: [] },
    })
  })

  it('should set viewport correctly', () => {
    const vp = { minLng: 78.1, minLat: 17.1, maxLng: 78.2, maxLat: 17.2 }
    useMapStore.getState().setViewport(vp)
    expect(useMapStore.getState().viewport).toEqual(vp)
  })

  it('should set selected segment', () => {
    useMapStore.getState().setSelectedSegment('segment-123')
    expect(useMapStore.getState().selectedSegmentId).toBe('segment-123')
  })

  it('should update filters', () => {
    useMapStore.getState().setFilters({ minScore: 0.5 })
    expect(useMapStore.getState().activeFilters.minScore).toBe(0.5)
  })
})
