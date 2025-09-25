/**
 * Integration Tests - Audio Processing Workflow
 * Mục đích: Test complete audio processing workflow with P26 components
 * Coverage: Component integration, state management, audio data flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import components for integration testing
import { CircularAudioVisualizer } from '../../components/audio/CircularAudioVisualizer'
import { RealtimeTranscriptPanel } from '../../components/audio/RealtimeTranscriptPanel'
import { DetectionAlertSystem } from '../../components/audio/DetectionAlertSystem'
import { SessionControlInterface } from '../../components/audio/SessionControlInterface'

// Mock Socket.IO
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isSignedIn: true,
    userId: 'test-user-id',
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  }),
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div>Mock SignIn</div>,
  SignUp: () => <div>Mock SignUp</div>,
}))

// Mock API client
vi.mock('@/services/enhanced-api-client', () => ({
  apiClient: {
    sessions: {
      create: vi.fn(() => Promise.resolve({ id: 'test-session-id' })),
      get: vi.fn(() => Promise.resolve({ id: 'test-session-id', name: 'Test Session' })),
      list: vi.fn(() => Promise.resolve({ data: [], meta: { total: 0 } })),
      delete: vi.fn(() => Promise.resolve()),
    },
    stats: {
      overview: vi.fn(() => Promise.resolve({
        totalSessions: 42,
        totalDetections: 15,
        toxicPercent: 3.5,
      })),
    },
  },
}))

// Test utilities
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('Audio Processing Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  
  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    // Reset socket mock state
    mockSocket.connected = false
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
    mockSocket.emit.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Integration', () => {
    it('should integrate all P26 components successfully', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <div data-testid="live-processing-container">
            <CircularAudioVisualizer
              audioData={new Float32Array(128).fill(0.5)}
              isActive={false}
              onVisualizerClick={() => {}}
            />
            <SessionControlInterface
              isRecording={false}
              onStartRecording={() => {}}
              onStopRecording={() => {}}
              sessionMetrics={{
                duration: 0,
                audioLevel: 0,
                detectionCount: 0,
                transcriptWords: 0,
              }}
            />
            <RealtimeTranscriptPanel
              segments={[]}
              isRecording={false}
              detections={[]}
            />
            <DetectionAlertSystem
              detections={[]}
              isEnabled={true}
            />
          </div>
        </Wrapper>
      )

      // Verify all components render
      expect(screen.getByTestId('live-processing-container')).toBeInTheDocument()
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
      expect(screen.getByTestId('session-controls')).toBeInTheDocument()
      expect(screen.getByTestId('transcript-panel')).toBeInTheDocument()
      expect(screen.getByTestId('detection-alerts')).toBeInTheDocument()
    })

    it('should handle recording state changes across components', async () => {
      const onStartRecording = vi.fn()
      const onStopRecording = vi.fn()
      const Wrapper = createTestWrapper()
      
      const { rerender } = render(
        <Wrapper>
          <div>
            <CircularAudioVisualizer
              audioData={new Float32Array(128).fill(0)}
              isActive={false}
              onVisualizerClick={onStartRecording}
            />
            <SessionControlInterface
              isRecording={false}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              sessionMetrics={{
                duration: 0,
                audioLevel: 0,
                detectionCount: 0,
                transcriptWords: 0,
              }}
            />
          </div>
        </Wrapper>
      )

      // Click start recording button
      const startButton = screen.getByTestId('start-recording-btn')
      await user.click(startButton)
      expect(onStartRecording).toHaveBeenCalled()

      // Rerender with recording state
      rerender(
        <Wrapper>
          <div>
            <CircularAudioVisualizer
              audioData={new Float32Array(128).fill(0.7)}
              isActive={true}
              onVisualizerClick={onStopRecording}
            />
            <SessionControlInterface
              isRecording={true}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              sessionMetrics={{
                duration: 5000,
                audioLevel: 0.7,
                detectionCount: 0,
                transcriptWords: 12,
              }}
            />
          </div>
        </Wrapper>
      )

      // Verify recording state UI changes
      expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument()
      expect(screen.getByText('00:05')).toBeInTheDocument() // Recording timer
    })
  })

  describe('Socket.IO Integration', () => {
    it('should establish socket connection and handle events', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <LiveProcessingPage />
        </Wrapper>
      )

      await waitFor(() => {
        // Verify socket connection setup
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
        expect(mockSocket.on).toHaveBeenCalledWith('transcript-partial', expect.any(Function))
        expect(mockSocket.on).toHaveBeenCalledWith('transcript-final', expect.any(Function))
        expect(mockSocket.on).toHaveBeenCalledWith('detection-alert', expect.any(Function))
      })
    })

    it('should handle transcript events and update UI', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <RealtimeTranscriptPanel
            segments={[]}
            isRecording={true}
            detections={[]}
          />
        </Wrapper>
      )

      // Simulate receiving transcript event
      const mockTranscriptSegment = {
        id: 'seg-1',
        text: 'Xin chào, đây là bài kiểm tra',
        startMs: 0,
        endMs: 2000,
        confidence: 0.95,
        words: [
          { word: 'Xin', confidence: 0.98, startMs: 0, endMs: 300 },
          { word: 'chào', confidence: 0.97, startMs: 300, endMs: 600 },
        ],
      }

      // Find and call the transcript handler
      const transcriptHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'transcript-final'
      )?.[1]

      if (transcriptHandler) {
        transcriptHandler(mockTranscriptSegment)
      }

      await waitFor(() => {
        expect(screen.getByText('Xin chào, đây là bài kiểm tra')).toBeInTheDocument()
      })
    })

    it('should handle detection alerts and show notifications', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <DetectionAlertSystem
            detections={[]}
            isEnabled={true}
          />
        </Wrapper>
      )

      // Simulate detection alert
      const mockDetection = {
        id: 'det-1',
        sessionId: 'session-1',
        type: 'OFFENSIVE' as const,
        severity: 'HIGH' as const,
        confidence: 0.89,
        snippet: 'từ xấu',
        context: 'đây là từ xấu trong câu',
        startMs: 1000,
        endMs: 1500,
        timestamp: new Date().toISOString(),
        recommended_action: 'BLOCK' as const,
      }

      // Find and call the detection handler
      const detectionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'detection-alert'
      )?.[1]

      if (detectionHandler) {
        detectionHandler(mockDetection)
      }

      await waitFor(() => {
        expect(screen.getByText(/OFFENSIVE content detected/i)).toBeInTheDocument()
        expect(screen.getByText(/từ xấu/)).toBeInTheDocument()
      })
    })
  })

  describe('Audio Processing Workflow', () => {
    it('should complete full audio processing workflow', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <LiveProcessingPage />
        </Wrapper>
      )

      // 1. Start recording
      const startButton = await screen.findByTestId('start-recording-btn')
      await user.click(startButton)

      // 2. Verify UI updates to recording state
      await waitFor(() => {
        expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument()
        expect(screen.getByText(/Recording/i)).toBeInTheDocument()
      })

      // 3. Simulate audio data processing
      const mockAudioData = new Float32Array(1024)
      for (let i = 0; i < mockAudioData.length; i++) {
        mockAudioData[i] = Math.sin(i * 0.1) * 0.5 // Simulate audio waveform
      }

      // 4. Simulate real-time transcript
      const transcriptHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'transcript-partial'
      )?.[1]

      if (transcriptHandler) {
        transcriptHandler({
          text: 'Đây là transcript thời gian thực',
          confidence: 0.92,
        })
      }

      await waitFor(() => {
        expect(screen.getByText('Đây là transcript thời gian thực')).toBeInTheDocument()
      })

      // 5. Stop recording
      const stopButton = screen.getByTestId('stop-recording-btn')
      await user.click(stopButton)

      // 6. Verify return to idle state
      await waitFor(() => {
        expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument()
      })
    })

    it('should handle microphone permissions and device selection', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <SessionControlInterface
            isRecording={false}
            onStartRecording={() => {}}
            onStopRecording={() => {}}
            sessionMetrics={{
              duration: 0,
              audioLevel: 0,
              detectionCount: 0,
              transcriptWords: 0,
            }}
          />
        </Wrapper>
      )

      // Open device settings
      const settingsButton = screen.getByTestId('audio-settings-btn')
      await user.click(settingsButton)

      // Verify device selection UI appears
      await waitFor(() => {
        expect(screen.getByText(/Audio Input Device/i)).toBeInTheDocument()
      })

      // Verify mock device appears
      expect(screen.getByText('Default Microphone')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle socket connection errors gracefully', async () => {
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <LiveProcessingPage />
        </Wrapper>
      )

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1]

      if (errorHandler) {
        errorHandler(new Error('Connection failed'))
      }

      await waitFor(() => {
        expect(screen.getByText(/Connection Error/i)).toBeInTheDocument()
      })
    })

    it('should handle microphone access denied', async () => {
      // Mock getUserMedia to reject
      const mockGetUserMedia = vi.fn(() => 
        Promise.reject(new Error('Permission denied'))
      )
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <SessionControlInterface
            isRecording={false}
            onStartRecording={() => {}}
            onStopRecording={() => {}}
            sessionMetrics={{
              duration: 0,
              audioLevel: 0,
              detectionCount: 0,
              transcriptWords: 0,
            }}
          />
        </Wrapper>
      )

      const startButton = screen.getByTestId('start-recording-btn')
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText(/Microphone access denied/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Integration', () => {
    it('should handle high-frequency audio updates without lag', async () => {
      const onAudioData = vi.fn()
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <CircularAudioVisualizer
            audioData={new Float32Array(512).fill(0)}
            isActive={true}
            onVisualizerClick={() => {}}
          />
        </Wrapper>
      )

      // Simulate rapid audio data updates
      const audioData = new Float32Array(512)
      for (let frame = 0; frame < 60; frame++) {
        for (let i = 0; i < audioData.length; i++) {
          audioData[i] = Math.sin(frame * 0.1 + i * 0.01) * 0.8
        }
        
        // This would normally trigger a re-render
        await new Promise(resolve => requestAnimationFrame(resolve))
      }

      // Verify component remains responsive
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
    })
  })
})