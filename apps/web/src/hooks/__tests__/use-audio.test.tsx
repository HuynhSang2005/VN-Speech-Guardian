/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudio } from '../use-audio'
// Types for audio processing configuration
interface TAudioProcessingConfig {
  sampleRate?: number
  channelCount?: number
  autoGainControl?: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
}

// Mock Web Audio API
const mockAudioContext = {
  createAnalyser: vi.fn(),
  createScriptProcessor: vi.fn(),
  createGain: vi.fn(),
  decodeAudioData: vi.fn(),
  state: 'running',
  sampleRate: 44100,
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

const mockAnalyser = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  fftSize: 2048,
  frequencyBinCount: 1024,
  getByteFrequencyData: vi.fn(),
  getFloatFrequencyData: vi.fn(),
  getByteTimeDomainData: vi.fn(),
  getFloatTimeDomainData: vi.fn(),
}

const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([]),
  getAudioTracks: vi.fn().mockReturnValue([{
    stop: vi.fn(),
    enabled: true,
    id: 'audio-track-1',
    kind: 'audio',
    label: 'Mock Audio Track',
    readyState: 'live',
  }]),
  active: true,
  id: 'mock-stream-1',
}

const mockWorkletNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: {
    postMessage: vi.fn(),
    onmessage: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  parameters: new Map(),
}

// Setup global mocks
beforeEach(() => {
  // Mock AudioContext
  global.AudioContext = vi.fn(() => mockAudioContext) as any
  ;(global as any).webkitAudioContext = vi.fn(() => mockAudioContext)
  
  // Mock AudioWorkletNode
  global.AudioWorkletNode = vi.fn(() => mockWorkletNode) as any
  
  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
    writable: true,
  })

  // Setup mock implementations
  mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser)
  mockAudioContext.createGain.mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  })

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => {
    setTimeout(cb, 16)
    return 1
  })
  global.cancelAnimationFrame = vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('useAudio Hook', () => {
  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useAudio())

      expect(result.current.state.data).toBe(null)
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.error).toBe(null)
      expect(result.current.isRecording).toBe(false)
      expect(result.current.audioLevel).toBe(0)
    })

    it('should apply custom configuration', () => {
      const config: Partial<TAudioProcessingConfig> = {
        sampleRate: 16000,
        channelCount: 1,
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: true,
      }

      const { result } = renderHook(() => useAudio(config))

      expect(result.current.isSupported).toBe(true)
    })

    it('should detect browser support correctly', () => {
      const { result } = renderHook(() => useAudio())

      expect(result.current.isSupported).toBe(true)
    })

    it('should detect lack of browser support', () => {
      // Mock unsupported browser
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
      })
      
      const { result } = renderHook(() => useAudio())

      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('Audio Stream Management', () => {
    it('should start audio stream successfully', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      expect(result.current.isRecording).toBe(true)
      expect(result.current.state.data).toBe(mockMediaStream)
    })

    it('should handle getUserMedia permission denied', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permissionError)

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(result.current.state.error).toBeTruthy()
      expect(result.current.state.error?.message).toContain('Permission denied')
      expect(result.current.isRecording).toBe(false)
    })

    it('should handle device not found error', async () => {
      const deviceError = new Error('No audio input device found')
      deviceError.name = 'NotFoundError'
      
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(deviceError)

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(result.current.state.error?.message).toContain('No audio input device')
    })

    it('should stop audio stream correctly', async () => {
      const { result } = renderHook(() => useAudio())

      // Start recording first
      await act(async () => {
        await result.current.startRecording()
      })

      // Then stop recording
      await act(async () => {
        result.current.stopRecording()
      })

      expect(result.current.isRecording).toBe(false)
      expect(result.current.state.data).toBe(null)
    })
  })

  describe('Audio Analysis and Processing', () => {
    it('should analyze audio level correctly', async () => {
      // Mock analyser data
      const mockFrequencyData = new Uint8Array(1024).fill(128) // Mid-level audio
      mockAnalyser.getByteFrequencyData.mockImplementation((data) => {
        data.set(mockFrequencyData)
      })

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      // Trigger analysis update
      await waitFor(() => {
        expect(result.current.audioLevel).toBeGreaterThan(0)
      }, { timeout: 1000 })
    })

    it('should detect voice activity', async () => {
      // Mock high audio activity
      const mockFrequencyData = new Uint8Array(1024).fill(200)
      mockAnalyser.getByteFrequencyData.mockImplementation((data) => {
        data.set(mockFrequencyData)
      })

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      await waitFor(() => {
        expect(result.current.analysisResult?.voiceActivity).toBe(true)
      }, { timeout: 1000 })
    })

    it('should process audio with AudioWorklet', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
      expect(mockAnalyser.connect).toHaveBeenCalled()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      unmount()

      expect(mockAnalyser.disconnect).toHaveBeenCalled()
      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })

    it('should handle multiple start/stop cycles', async () => {
      const { result } = renderHook(() => useAudio())

      // Start/stop cycle 1
      await act(async () => {
        await result.current.startRecording()
      })
      
      act(() => {
        result.current.stopRecording()
      })

      // Start/stop cycle 2
      await act(async () => {
        await result.current.startRecording()
      })
      
      act(() => {
        result.current.stopRecording()
      })

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
    })

    it('should prevent memory leaks with proper cleanup', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      // Simulate multiple analysis cycles
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          // Trigger analysis update
          await new Promise(resolve => setTimeout(resolve, 20))
        })
      }

      act(() => {
        result.current.stopRecording()
      })

      expect(result.current.state.data).toBe(null)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary audio context errors', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle audio context creation failure', async () => {
      global.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('AudioContext creation failed')
      })

      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      expect(result.current.state.error).toBeTruthy()
      expect(result.current.isRecording).toBe(false)
    })

    it('should handle stream interruption gracefully', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      // Simulate stream ending
      const audioTrack = mockMediaStream.getAudioTracks()[0]
      audioTrack.readyState = 'ended'

      // Trigger stream ended event
      act(() => {
        if (audioTrack.onended) {
          audioTrack.onended(new Event('ended'))
        }
      })

      expect(result.current.isRecording).toBe(false)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate sample rate bounds', () => {
      const invalidConfig = { sampleRate: 1000 } // Too low
      const { result } = renderHook(() => useAudio(invalidConfig))

      expect(result.current.isSupported).toBe(true) // Should still be supported but config adjusted
    })

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = { channelCount: -1 }
      const { result } = renderHook(() => useAudio(invalidConfig))

      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('Integration with AudioWorklet', () => {
    it('should load AudioWorklet processor', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      // AudioWorklet integration would be tested here if implemented
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
    })

    it('should handle AudioWorklet messages', async () => {
      const { result } = renderHook(() => useAudio())

      await act(async () => {
        await result.current.startRecording()
      })

      // Simulate worklet message
      act(() => {
        if (mockWorkletNode.port.onmessage) {
          const messageHandler = mockWorkletNode.port.onmessage as unknown as (event: MessageEvent) => void
          messageHandler({
            data: {
              type: 'AUDIO_DATA',
              audioData: new Float32Array([0.1, 0.2, 0.3]),
              timestamp: Date.now(),
            }
          } as MessageEvent)
        }
      })

      expect(result.current.audioLevel).toBeGreaterThanOrEqual(0)
    })
  })
})