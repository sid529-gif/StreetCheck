import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { useSessionStore } from '../store/sessionStore.js'

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'map.reportModal.title': 'Report Hazard',
    'map.reportModal.near': 'Near {{name}}',
    'map.reportModal.cancel': 'Cancel reporting',
    'map.reportModal.see': 'What did you see?',
    'map.reportModal.suggested': 'Suggested',
    'map.reportModal.aiRunning': 'Running AI Hazard Detection...',
    'map.reportModal.aiTitle': 'AI Hazard Recommendation',
    'map.reportModal.aiDesc':
      'AI detected: <1>{{type}}</1> with <3>{{confidence}}%</3> confidence. Is this correct?',
    'map.reportModal.aiSubmit': 'Yes, submit',
    'map.reportModal.aiChoose': 'No, let me choose',
    'map.reportModal.noteLabel': 'Add a note (optional)',
    'map.reportModal.notePlaceholder':
      "Provide extra details e.g., 'Right lane flooded' or 'broken cover'...",
    'map.reportModal.photoLabel': 'Add photo',
    'map.reportModal.submitButton': 'Submit Report',
    'map.reportModal.submitting': 'Submitting...',
    'map.reportModal.successMsg': 'Success! Safety score recalculated: {{score}}%',
    'map.hazards.pothole': 'Pothole',
    'map.hazards.broken_streetlight': 'Light',
    'map.hazards.waterlogging': 'Flood',
    'map.hazards.construction_debris': 'Build',
    'map.hazards.open_manhole': 'Debris',
    'map.hazards.stray_animals': 'Animal',
    'map.hazards.broken_footpath': 'Footpath',
    'map.unnamedStreet': 'Unnamed Street',
  }

  const tMock = (key: string, options?: any) => {
    let value = translations[key] || key
    if (options) {
      if (value === key && options.defaultValue) {
        value = options.defaultValue
      }
      Object.keys(options).forEach((optKey) => {
        value = value.replace(new RegExp(`{{\\s*${optKey}\\s*}}`, 'g'), String(options[optKey]))
      })
    }
    return value
  }

  return {
    useTranslation: () => ({
      t: tMock,
      i18n: {
        changeLanguage: () => Promise.resolve(),
        language: 'en',
      },
    }),
    Trans: ({ children }: any) => children,
  }
})

// Mock axios at the network level to intercept api calls
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    post: vi.fn((url) => {
      if (url.includes('/api/ai/detect-photo')) {
        return Promise.resolve({
          data: {
            suggestedType: 'pothole',
            confidence: 0.85,
          },
        })
      }
      if (url.includes('/api/reports')) {
        return Promise.resolve({
          data: {
            reportId: '11111111-2222-3333-4444-555555555555',
            segmentId: 'seg-123',
            confirmedType: 'pothole',
            severityWeight: 0.6,
            expiresAt: new Date().toISOString(),
            updatedSegment: {
              segmentId: 'seg-123',
              safetyScore: 0.74,
              safetyBand: 'amber',
              activeReportCount: 1,
            },
          },
        })
      }
      return Promise.resolve({ data: {} })
    }),
    get: vi.fn(() => Promise.resolve({ data: {} })),
  }
  return {
    default: mockAxios,
  }
})

// Mock PhotoUploader
vi.mock('../components/reporting/PhotoUploader.js', () => ({
  PhotoUploader: ({ onUploadSuccess }: any) => (
    <button
      data-testid="mock-uploader"
      onClick={() => onUploadSuccess('https://example.com/pothole.jpg')}
    >
      Upload Image
    </button>
  ),
}))

import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportModal } from '../components/reporting/ReportModal.js'
import type { SegmentDetail } from '../services/api.js'

const mockSegment: SegmentDetail = {
  id: 'seg-123',
  osmWayId: '10001',
  name: 'Test Road',
  geometry: {
    type: 'LineString',
    coordinates: [
      [78.4, 17.4],
      [78.5, 17.5],
    ],
  },
  bbox: { minLng: 78.4, minLat: 17.4, maxLng: 78.5, maxLat: 17.5 },
  school: 70,
  hospital: 60,
  park: 50,
  bus_stop: 80,
  footpath: 65,
  safetyScore: 0.5,
  safetyBand: 'amber' as const,
  scoringVersion: 1,
  osmHighway: 'primary',
  osmLit: 'yes',
  osmSurface: 'asphalt',
  osmFootway: null,
  osmSidewalk: null,
  activeReports: 0,
  reports: [],
  lastUpdated: new Date().toISOString(),
  lastOsmSync: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

// Custom waitFor helper to resolve async test expectations
const waitForExpect = async (fn: () => void, timeout = 1000) => {
  const start = Date.now()
  while (true) {
    try {
      fn()
      return
    } catch (err) {
      if (Date.now() - start > timeout) throw err
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

describe('ReportModal', () => {
  let container: HTMLDivElement
  let queryClient: QueryClient

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    // Initialize session token with valid UUID for test runs
    useSessionStore.setState({ anonymousToken: 'a0b1c2d3-e4f5-6789-0123-456789abcdef' })
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('renders all 6 hazard type icons', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const text = container.textContent || ''
    expect(text).toContain('Pothole')
    expect(text).toContain('Light')
    expect(text).toContain('Flood')
    expect(text).toContain('Build')
    expect(text).toContain('Debris')
    expect(text).toContain('Animal')
  })

  it('selecting a hazard type highlights it with amber border', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const buttons = container.querySelectorAll('button')
    let potholeBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Pothole')) {
        potholeBtn = btn
      }
    })

    expect(potholeBtn).not.toBeNull()
    expect(potholeBtn!.className).not.toContain('border-[#f59e0b]')

    await act(async () => {
      potholeBtn!.click()
    })

    expect(potholeBtn!.className).toContain('border-[#f59e0b]')
  })

  it('submit button is disabled until a hazard type is selected', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const buttons = container.querySelectorAll('button')
    let submitBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Submit Report')) {
        submitBtn = btn
      }
    })

    expect(submitBtn).not.toBeNull()
    expect(submitBtn!.disabled).toBe(true)

    let potholeBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Pothole')) {
        potholeBtn = btn
      }
    })
    await act(async () => {
      potholeBtn!.click()
    })

    expect(submitBtn!.disabled).toBe(false)
  })

  it('shows AI suggestion banner when CV detects a hazard', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const uploaderBtn = container.querySelector(
      '[data-testid="mock-uploader"]'
    ) as HTMLButtonElement
    expect(uploaderBtn).not.toBeNull()

    await act(async () => {
      uploaderBtn.click()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    const text = container.textContent || ''
    expect(text).toContain('AI Hazard Recommendation')
    expect(text.toLowerCase()).toContain('ai detected: pothole')
    expect(text).toContain('85% confidence')
  })

  it('calls onSuccess when report is submitted successfully', async () => {
    const onSuccessMock = vi.fn()
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal
            segment={mockSegment}
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={onSuccessMock}
          />
        </QueryClientProvider>
      )
    })

    const buttons = container.querySelectorAll('button')
    let potholeBtn: HTMLButtonElement | null = null
    let submitBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Pothole')) {
        potholeBtn = btn
      }
      if (btn.textContent?.includes('Submit Report')) {
        submitBtn = btn
      }
    })

    await act(async () => {
      potholeBtn!.click()
    })

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await act(async () => {
      textarea.value = 'A large dangerous pothole'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      submitBtn!.click()
    })

    await act(async () => {
      await waitForExpect(() => {
        expect(onSuccessMock).toHaveBeenCalledWith(
          expect.stringContaining('Success! Safety score recalculated: 74%')
        )
      })
    })
  })

  it('submits suggestions directly when "Yes, submit" is clicked', async () => {
    const onSuccessMock = vi.fn()
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal
            segment={mockSegment}
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={onSuccessMock}
          />
        </QueryClientProvider>
      )
    })

    const uploaderBtn = container.querySelector(
      '[data-testid="mock-uploader"]'
    ) as HTMLButtonElement
    await act(async () => {
      uploaderBtn.click()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    const buttons = container.querySelectorAll('button')
    let yesSubmitBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Yes, submit')) {
        yesSubmitBtn = btn
      }
    })

    expect(yesSubmitBtn).not.toBeNull()
    await act(async () => {
      yesSubmitBtn!.click()
    })

    await act(async () => {
      await waitForExpect(() => {
        expect(onSuccessMock).toHaveBeenCalled()
      })
    })
  })

  it('shows standard grid when "No, let me choose" is clicked', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const uploaderBtn = container.querySelector(
      '[data-testid="mock-uploader"]'
    ) as HTMLButtonElement
    await act(async () => {
      uploaderBtn.click()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    const buttons = container.querySelectorAll('button')
    let noChooseBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('No, let me choose')) {
        noChooseBtn = btn
      }
    })

    expect(noChooseBtn).not.toBeNull()
    await act(async () => {
      noChooseBtn!.click()
    })

    const text = container.textContent || ''
    expect(text).toContain('Pothole')
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const onCloseMock = vi.fn()
    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal
            segment={mockSegment}
            isOpen={true}
            onClose={onCloseMock}
            onSuccess={vi.fn()}
          />
        </QueryClientProvider>
      )
    })

    const buttons = container.querySelectorAll('button')
    let cancelBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Cancel')) {
        cancelBtn = btn
      }
    })

    expect(cancelBtn).not.toBeNull()
    await act(async () => {
      cancelBtn!.click()
    })

    expect(onCloseMock).toHaveBeenCalled()
  })

  it('displays error message when report submission fails', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Server error occurred',
        },
      },
    })

    await act(async () => {
      ReactDOM.createRoot(container).render(
        <QueryClientProvider client={queryClient}>
          <ReportModal segment={mockSegment} isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </QueryClientProvider>
      )
    })

    const buttons = container.querySelectorAll('button')
    let potholeBtn: HTMLButtonElement | null = null
    let submitBtn: HTMLButtonElement | null = null
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Pothole')) {
        potholeBtn = btn
      }
      if (btn.textContent?.includes('Submit Report')) {
        submitBtn = btn
      }
    })

    await act(async () => {
      potholeBtn!.click()
    })

    await act(async () => {
      submitBtn!.click()
    })

    await act(async () => {
      await waitForExpect(() => {
        const text = container.textContent || ''
        expect(text).toContain('Server error occurred')
      })
    })
  })
})
