/**
 * Integration Tests - P26 Components Integration
 * Mục đích: Test integration between P26 audio components
 * Coverage: Component mounting, Canvas rendering, basic interaction
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

describe('P26 Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CircularAudioVisualizer', () => {
    it('should render with basic props', () => {
      render(
        <TestWrapper>
          <CircularAudioVisualizer
            isRecording={false}
            audioData={new Float32Array(128).fill(0.5)}
          />
        </TestWrapper>
      )

      const canvas = screen.getByTestId('audio-visualizer')
      expect(canvas).toBeDefined()
      expect(canvas.tagName).toBe('CANVAS')
    })

    it('should handle recording state changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <CircularAudioVisualizer
            isRecording={false}
            audioData={new Float32Array(64)}
          />
        </TestWrapper>
      )

      // Verify idle state
      let canvas = screen.getByTestId('audio-visualizer')
      expect(canvas).toBeDefined()

      // Switch to recording state
      rerender(
        <TestWrapper>
          <CircularAudioVisualizer
            isRecording={true}
            audioData={new Float32Array(64).fill(0.8)}
          />
        </TestWrapper>
      )

      canvas = screen.getByTestId('audio-visualizer')
      expect(canvas).toBeDefined()
    })
  })

  describe('RealtimeTranscriptPanel', () => {
    it('should render with empty segments', () => {
      render(
        <TestWrapper>
          <RealtimeTranscriptPanel
            segments={[]}
            isRecording={false}
          />
        </TestWrapper>
      )

      const panel = screen.getByTestId('transcript-panel')
      expect(panel).toBeDefined()
      expect(screen.getByText(/No transcript available yet/i)).toBeDefined()
    })

    it('should display transcript segments', () => {
      const mockSegments = [
        {
          id: 'seg-1',
          text: 'Xin chào thế giới',
          startMs: 0,
          endMs: 2000,
          confidence: 0.95,
          words: [
            { word: 'Xin', confidence: 0.98, startMs: 0, endMs: 300 },
            { word: 'chào', confidence: 0.97, startMs: 300, endMs: 800 },
            { word: 'thế', confidence: 0.96, startMs: 800, endMs: 1200 },
            { word: 'giới', confidence: 0.94, startMs: 1200, endMs: 2000 },
          ],
        },
      ]

      render(
        <TestWrapper>
          <RealtimeTranscriptPanel
            segments={mockSegments}
            isRecording={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Xin chào thế giới')).toBeDefined()
    })
  })

  describe('DetectionAlertSystem', () => {
    it('should render with no alerts initially', () => {
      render(
        <TestWrapper>
          <DetectionAlertSystem isEnabled={true} />
        </TestWrapper>
      )

      const alertsContainer = screen.getByTestId('detection-alerts')
      expect(alertsContainer).toBeDefined()
    })

    it('should display detection alerts', async () => {
      const mockDetections = [
        {
          id: 'det-1',
          type: 'OFFENSIVE' as const,
          severity: 'HIGH' as const,
          confidence: 0.89,
          snippet: 'nội dung xấu',
          context: 'đây là nội dung xấu trong câu',
          startMs: 1000,
          endMs: 1500,
          timestamp: new Date().toISOString(),
          recommended_action: 'BLOCK' as const,
        },
      ]

      const { rerender } = render(
        <TestWrapper>
          <DetectionAlertSystem isEnabled={true} />
        </TestWrapper>
      )

      // Add detection
      rerender(
        <TestWrapper>
          <DetectionAlertSystem 
            isEnabled={true}
            initialDetections={mockDetections}
          />
        </TestWrapper>
      )

      const alertsContainer = screen.getByTestId('detection-alerts')
      expect(alertsContainer).toBeDefined()
    })
  })

  describe('SessionControlInterface', () => {
    it('should render control interface', async () => {
      const mockMetrics = {
        duration: 0,
        audioLevel: 0,
        detectionCount: 0,
        transcriptWords: 0,
      }

      render(
        <TestWrapper>
          <SessionControlInterface
            sessionMetrics={mockMetrics}
            onStartRecording={async () => {}}
            onStopRecording={async () => {}}
          />
        </TestWrapper>
      )

      const controls = screen.getByTestId('session-controls')
      expect(controls).toBeDefined()
      
      const startButton = screen.getByTestId('start-recording-btn')
      expect(startButton).toBeDefined()
    })
  })

  describe('Components Integration', () => {
    it('should render all P26 components together', () => {
      const mockMetrics = {
        duration: 0,
        audioLevel: 0,
        detectionCount: 0,
        transcriptWords: 0,
      }

      render(
        <TestWrapper>
          <div data-testid="live-processing-container">
            <CircularAudioVisualizer
              audioData={new Float32Array(128).fill(0.3)}
              isRecording={false}
            />
            <SessionControlInterface
              sessionMetrics={mockMetrics}
              onStartRecording={async () => {}}
              onStopRecording={async () => {}}
            />
            <RealtimeTranscriptPanel
              segments={[]}
              isRecording={false}
            />
            <DetectionAlertSystem isEnabled={true} />
          </div>
        </TestWrapper>
      )

      // Verify all components are present
      expect(screen.getByTestId('live-processing-container')).toBeDefined()
      expect(screen.getByTestId('audio-visualizer')).toBeDefined()
      expect(screen.getByTestId('session-controls')).toBeDefined()
      expect(screen.getByTestId('transcript-panel')).toBeDefined()
      expect(screen.getByTestId('detection-alerts')).toBeDefined()
    })

    it('should handle state transitions properly', () => {
      const mockMetrics = {
        duration: 5000,
        audioLevel: 0.7,
        detectionCount: 2,
        transcriptWords: 15,
      }

      const mockSegments = [
        {
          id: 'seg-1',
          text: 'Đây là transcript mẫu',
          startMs: 0,
          endMs: 3000,
          confidence: 0.92,
          words: [],
        },
      ]

      render(
        <TestWrapper>
          <div data-testid="recording-state-container">
            <CircularAudioVisualizer
              audioData={new Float32Array(256).fill(0.6)}
              isRecording={true}
            />
            <SessionControlInterface
              sessionMetrics={mockMetrics}
              onStartRecording={async () => {}}
              onStopRecording={async () => {}}
            />
            <RealtimeTranscriptPanel
              segments={mockSegments}
              isRecording={true}
            />
          </div>
        </TestWrapper>
      )

      // Verify recording state is reflected in components
      expect(screen.getByTestId('recording-state-container')).toBeDefined()
      expect(screen.getByText('Đây là transcript mẫu')).toBeDefined()
      expect(screen.getByTestId('stop-recording-btn')).toBeDefined()
    })
  })

  describe('Performance Integration', () => {
    it('should handle rapid data updates without errors', () => {
      const { rerender } = render(
        <TestWrapper>
          <CircularAudioVisualizer
            audioData={new Float32Array(512)}
            isRecording={true}
          />
        </TestWrapper>
      )

      // Simulate rapid audio data updates
      for (let i = 0; i < 10; i++) {
        const audioData = new Float32Array(512)
        for (let j = 0; j < audioData.length; j++) {
          audioData[j] = Math.sin(i * 0.1 + j * 0.01) * 0.8
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

      // Component should still be responsive
      expect(screen.getByTestId('audio-visualizer')).toBeDefined()
    })
  })
})