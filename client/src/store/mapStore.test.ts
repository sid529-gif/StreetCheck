import { beforeEach, describe, expect, it } from 'vitest'
import { useMapStore } from './mapStore.js'

describe('mapStore', () => {
  beforeEach(() => {
    useMapStore.setState({
      viewport: null,
      selectedSegmentId: null,
      selectedAreaName: null,
      activeFilters: { minScore: 0, hazardTypes: [] },
      activeLayer: 'composite',
    })
  })

  it('should set viewport correctly', () => {
    const vp = { minLng: 78.1, minLat: 17.1, maxLng: 78.2, maxLat: 17.2 }
    useMapStore.getState().setViewport(vp)
    expect(useMapStore.getState().viewport).toEqual(vp)
  })

  it('should clear viewport when set to null', () => {
    const vp = { minLng: 78.1, minLat: 17.1, maxLng: 78.2, maxLat: 17.2 }
    useMapStore.getState().setViewport(vp)
    useMapStore.getState().setViewport(null)
    expect(useMapStore.getState().viewport).toBeNull()
  })

  it('should set selected segment and clear selectedAreaName', () => {
    useMapStore.setState({ selectedAreaName: 'Banjara Hills' })
    useMapStore.getState().setSelectedSegment('segment-123')
    expect(useMapStore.getState().selectedSegmentId).toBe('segment-123')
    expect(useMapStore.getState().selectedAreaName).toBeNull()
  })

  it('should preserve selectedAreaName when segment is cleared', () => {
    useMapStore.setState({ selectedAreaName: 'Banjara Hills', selectedSegmentId: 'seg-1' })
    useMapStore.getState().setSelectedSegment(null)
    expect(useMapStore.getState().selectedSegmentId).toBeNull()
    expect(useMapStore.getState().selectedAreaName).toBe('Banjara Hills')
  })

  it('should set selected area name and clear selectedSegmentId', () => {
    useMapStore.setState({ selectedSegmentId: 'seg-1' })
    useMapStore.getState().setSelectedAreaName('Jubilee Hills')
    expect(useMapStore.getState().selectedAreaName).toBe('Jubilee Hills')
    expect(useMapStore.getState().selectedSegmentId).toBeNull()
  })

  it('should preserve selectedSegmentId when area name is cleared', () => {
    useMapStore.setState({ selectedSegmentId: 'seg-2', selectedAreaName: 'Gachibowli' })
    useMapStore.getState().setSelectedAreaName(null)
    expect(useMapStore.getState().selectedAreaName).toBeNull()
    expect(useMapStore.getState().selectedSegmentId).toBe('seg-2')
  })

  it('should update filters while preserving existing ones', () => {
    useMapStore.getState().setFilters({ minScore: 0.5 })
    expect(useMapStore.getState().activeFilters.minScore).toBe(0.5)
    expect(useMapStore.getState().activeFilters.hazardTypes).toEqual([])
  })

  it('should set active layer', () => {
    useMapStore.getState().setActiveLayer('school')
    expect(useMapStore.getState().activeLayer).toBe('school')
  })

  it('should switch between active layers', () => {
    useMapStore.getState().setActiveLayer('hospital')
    expect(useMapStore.getState().activeLayer).toBe('hospital')
    useMapStore.getState().setActiveLayer('composite')
    expect(useMapStore.getState().activeLayer).toBe('composite')
  })
})
