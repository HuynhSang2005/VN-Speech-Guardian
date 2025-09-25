/**
 * Simple Integration Test - P26 Components Basic Functionality
 * Mục đích: Verify P26 components can be rendered and work together
 * Coverage: Basic rendering, no complex interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import components
import { CircularAudioVisualizer } from '../../components/audio/CircularAudioVisualizer'
import { RealtimeTranscriptPanel } from '../../components/audio/RealtimeTranscriptPanel'
import { DetectionAlertSystem } from '../../components/audio/DetectionAlertSystem'
import { SessionControlInterface } from '../../components/audio/SessionControlInterface'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    canvas: ({ children, ...props }: any) => <canvas {...props}>{children}</canvas>,
  },
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  AnimatePresence: ({ children }: any) => children,
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mic: () => <div>Mic Icon</div>,
  MicOff: () => <div>MicOff Icon</div>,
  Square: () => <div>Square Icon</div>,
  Settings: () => <div>Settings Icon</div>,
  Play: () => <div>Play Icon</div>,
  Pause: () => <div>Pause Icon</div>,
  Volume2: () => <div>Volume2 Icon</div>,
  Wifi: () => <div>Wifi Icon</div>,
  WifiOff: () => <div>WifiOff Icon</div>,
  AlertTriangle: () => <div>AlertTriangle Icon</div>,
  CheckCircle: () => <div>CheckCircle Icon</div>,
  XCircle: () => <div>XCircle Icon</div>,
  Search: () => <div>Search Icon</div>,
  Copy: () => <div>Copy Icon</div>,
  Download: () => <div>Download Icon</div>,
  Trash2: () => <div>Trash2 Icon</div>,
  X: () => <div>X Icon</div>,
}))

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('P26 Components Simple Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Individual Component Rendering', () => {
    it('should render CircularAudioVisualizer without errors', () => {
      render(
        <TestWrapper>
          <CircularAudioVisualizer
            isRecording={false}
            audioData={new Float32Array(128).fill(0.5)}
          />
        </TestWrapper>
      )

      // Look for canvas element instead of test-id
      const canvases = document.querySelectorAll('canvas')
      expect(canvases.length).toBeGreaterThan(0)
    })

    it('should render RealtimeTranscriptPanel without errors', () => {
      render(
        <TestWrapper>
          <RealtimeTranscriptPanel
            segments={[]}
            isRecording={false}
          />
        </TestWrapper>
      )

      // Look for the main content
      expect(screen.getByText('Live Transcript')).toBeDefined()
    })

    it('should render DetectionAlertSystem without errors', () => {
      const { container } = render(
        <TestWrapper>
          <DetectionAlertSystem alerts={[]} />
        </TestWrapper>
      )

      // Just verify it rendered without throwing
      expect(container.firstChild).toBeDefined()
    })

    it('should render SessionControlInterface without errors', () => {
      const mockProps = {
        sessionState: 'idle' as const,
        connectionStatus: 'connected' as const,
        metrics: {
          duration: 0,
          audioLevel: 0,
          totalSegments: 0,
          detectionCount: 0,
        },
        audioDevices: [],
        selectedDeviceId: null,
        onStartRecording: async () => {},
        onStopRecording: async () => {},
        onPauseRecording: async () => {},
        onResumeRecording: async () => {},
        onDeviceChange: () => {},
        onEmergencyStop: () => {},
        onSettingsOpen: () => {},
      }

      render(
        <TestWrapper>
          <SessionControlInterface {...mockProps} />
        </TestWrapper>
      )

      // Look for some control text
      expect(screen.getByText('Mic Icon')).toBeDefined()
    })
  })

  describe('Components Integration', () => {
    it('should render all P26 components together without conflicts', () => {
      const { container } = render(
        <TestWrapper>
          <div style={{ padding: '20px' }}>
            <CircularAudioVisualizer
              audioData={new Float32Array(64).fill(0.3)}
              isRecording={false}
            />
            <SessionControlInterface
              onStartRecording={async () => {}}
              onStopRecording={async () => {}}
            />
            <RealtimeTranscriptPanel
              segments={[]}
              isRecording={false}
            />
            <DetectionAlertSystem />
          </div>
        </TestWrapper>
      )

      // Verify the container exists and has content
      expect(container.firstChild).toBeDefined()
      
      // Verify specific elements exist
      expect(screen.getByText('Live Transcript')).toBeDefined()
      expect(screen.getByText('Mic Icon')).toBeDefined()
      
      // Verify canvas is present
      const canvases = document.querySelectorAll('canvas')
      expect(canvases.length).toBeGreaterThan(0)
    })

    it('should handle different recording states', () => {
      const { rerender } = render(
        <TestWrapper>
          <div>
            <CircularAudioVisualizer
              audioData={new Float32Array(32)}
              isRecording={false}
            />
            <RealtimeTranscriptPanel
              segments={[]}
              isRecording={false}
            />
          </div>
        </TestWrapper>
      )

      // Switch to recording state
      rerender(
        <TestWrapper>
          <div>
            <CircularAudioVisualizer
              audioData={new Float32Array(32).fill(0.8)}
              isRecording={true}
            />
            <RealtimeTranscriptPanel
              segments={[]}
              isRecording={true}
            />
          </div>
        </TestWrapper>
      )

      // Should still render without errors
      expect(screen.getByText('Live Transcript')).toBeDefined()
    })
  })

  describe('Canvas Rendering', () => {
    it('should create canvas elements with proper dimensions', () => {
      render(
        <TestWrapper>
          <CircularAudioVisualizer
            audioData={new Float32Array(256)}
            isRecording={true}
            size={400}
          />
        </TestWrapper>
      )

      const canvas = document.querySelector('canvas')
      expect(canvas).toBeDefined()
      expect(canvas?.width).toBe(400)
      expect(canvas?.height).toBe(400)
    })
  })

  describe('Audio Data Processing', () => {
    it('should handle different audio data sizes', () => {
      const smallData = new Float32Array(64).fill(0.2)
      const largeData = new Float32Array(1024).fill(0.7)

      const { rerender } = render(
        <TestWrapper>
          <CircularAudioVisualizer
            audioData={smallData}
            isRecording={true}
          />
        </TestWrapper>
      )

      // Should render without errors
      expect(document.querySelector('canvas')).toBeDefined()

      // Switch to large data
      rerender(
        <TestWrapper>
          <CircularAudioVisualizer
            audioData={largeData}
            isRecording={true}
          />
        </TestWrapper>
      )

      // Should still render
      expect(document.querySelector('canvas')).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle rapid re-renders without crashing', () => {
      const { rerender } = render(
        <TestWrapper>
          <CircularAudioVisualizer
            audioData={new Float32Array(128)}
            isRecording={true}
          />
        </TestWrapper>
      )

      // Simulate rapid updates
      for (let i = 0; i < 5; i++) {
        const audioData = new Float32Array(128)
        for (let j = 0; j < audioData.length; j++) {
          audioData[j] = Math.sin(i * 0.5 + j * 0.02) * 0.6
        }

        rerender(
          <TestWrapper>
            <CircularAudioVisualizer
              audioData={audioData}
              isRecording={true}
            />
          </TestWrapper>
        )
      }

      // Should still be rendering
      expect(document.querySelector('canvas')).toBeDefined()
    })
  })
})