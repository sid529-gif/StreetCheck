import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScoreDisplay } from '../components/common/ScoreDisplay.js'
import { SAFETY_COLOURS } from '../services/safetyColours.js'

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'map.bands.green': 'Safe',
    'map.bands.amber': 'Caution',
    'map.bands.red': 'Avoid',
    'map.safetyIndex': 'Safety Index',
  }
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] || key,
      i18n: {
        changeLanguage: () => Promise.resolve(),
        language: 'en',
      },
    }),
    Trans: ({ children }: any) => children,
  }
})

describe('ScoreDisplay', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('shows green colour for band=green', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ScoreDisplay score={0.85} band="green" />)
    })

    const text = container.textContent || ''
    // Check if green label text is rendered (e.g. SAFE)
    expect(text).toContain(SAFETY_COLOURS.green.label)

    // Check if the correct text color class is applied
    const labelSpan = container.querySelector('.flex-col span')
    expect(labelSpan?.className).toContain(SAFETY_COLOURS.green.text)
  })

  it('shows amber colour for band=amber', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ScoreDisplay score={0.55} band="amber" />)
    })

    const text = container.textContent || ''
    expect(text).toContain(SAFETY_COLOURS.amber.label)

    const labelSpan = container.querySelector('.flex-col span')
    expect(labelSpan?.className).toContain(SAFETY_COLOURS.amber.text)
  })

  it('shows red colour for band=red', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ScoreDisplay score={0.3} band="red" />)
    })

    const text = container.textContent || ''
    expect(text).toContain(SAFETY_COLOURS.red.label)

    const labelSpan = container.querySelector('.flex-col span')
    expect(labelSpan?.className).toContain(SAFETY_COLOURS.red.text)
  })

  it('displays score as integer percentage', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ScoreDisplay score={0.756} band="green" />)
    })

    const scoreSpan = container.querySelector('.absolute')
    // 0.756 rounded to percentage should be 76
    expect(scoreSpan?.textContent).toBe('76')
  })
})
