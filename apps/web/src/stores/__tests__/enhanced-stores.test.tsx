/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  useAudioStore, 
  useUIStore, 
  usePerformanceStore,
  audioSelectors,
  uiSelectors,
  type Session,
  type TranscriptSegment,
  type Detection
} from '../enhanced-stores-simple'

// Mock data factories for testing
const createMockSession = (): Session => ({
  id: 'test-session-123',
  name: 'Test Session',
  description: 'Test session description',
  startedAt: '2025-01-21T10:00:00Z',
  endedAt: null,
  lang: 'vi'
})

const createMockTranscriptSegment = (): TranscriptSegment => ({
  id: 'segment-123',
  text: 'Xin chào, tôi đang test audio',
  timestamp: '2025-01-21T10:00:00Z',
  confidence: 0.95
})

const createMockDetection = (): Detection => ({
  id: 'detection-123',
  type: 'OFFENSIVE',
  severity: 'medium',
  confidence: 0.85,
  snippet: 'test snippet',
  timestamp: '2025-01-21T10:00:00Z'
})

describe('Enhanced Stores - Zustand State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset all stores to initial state for test isolation
    useAudioStore.getState().actions.clearSession()
    useAudioStore.getState().actions.changeTheme('default')
    usePerformanceStore.getState().actions.reset()
    
    // Clear UI store notifications
    const uiStore = useUIStore.getState()
    uiStore.notifications.forEach(notification => {
      if (notification.id) {
        uiStore.actions.removeNotification(notification.id)
      }
    })
  })

  describe('AudioStore - Core Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAudioStore())
      
      expect(result.current.isRecording).toBe(false)
      expect(result.current.audioData).toBeNull()
      expect(result.current.volume).toBe(0)
      expect(result.current.sensitivity).toBe(0.5)
      expect(result.current.currentSession).toBeNull()
      expect(result.current.transcript).toEqual([])
      expect(result.current.detections).toEqual([])
      expect(result.current.visualizerTheme).toBe('default')
    })

    it('should handle recording state transitions', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        result.current.actions.startRecording()
      })
      expect(result.current.isRecording).toBe(true)

      act(() => {
        result.current.actions.stopRecording()
      })
      expect(result.current.isRecording).toBe(false)
    })

    it('should update audio data and calculate volume', () => {
      const { result } = renderHook(() => useAudioStore())
      const mockAudioData = new Float32Array([0.1, -0.2, 0.3, -0.4, 0.5])

      act(() => {
        result.current.actions.updateAudioData(mockAudioData)
      })

      expect(result.current.audioData).toEqual(mockAudioData)
      expect(result.current.volume).toBeGreaterThan(0)
      expect(result.current.volume).toBeLessThanOrEqual(1)
    })

    it('should update sensitivity correctly', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        result.current.actions.updateSensitivity(0.8)
      })

      expect(result.current.sensitivity).toBe(0.8)
    })

    it('should add transcript segments', () => {
      const { result } = renderHook(() => useAudioStore())
      const mockSegment = createMockTranscriptSegment()

      act(() => {
        result.current.actions.addTranscriptSegment(mockSegment)
      })

      expect(result.current.transcript).toHaveLength(1)
      expect(result.current.transcript[0]).toEqual(mockSegment)
    })

    it('should add detections', () => {
      const { result } = renderHook(() => useAudioStore())
      const mockDetection = createMockDetection()

      act(() => {
        result.current.actions.addDetection(mockDetection)
      })

      expect(result.current.detections).toHaveLength(1)
      expect(result.current.detections[0]).toEqual(mockDetection)
    })

    it('should clear session data', () => {
      const { result } = renderHook(() => useAudioStore())
      const mockSegment = createMockTranscriptSegment()
      const mockDetection = createMockDetection()
      const mockAudioData = new Float32Array([0.1, 0.2, 0.3])

      // Add some data first
      act(() => {
        result.current.actions.startRecording()
        result.current.actions.updateAudioData(mockAudioData)
        result.current.actions.addTranscriptSegment(mockSegment)
        result.current.actions.addDetection(mockDetection)
      })

      // Clear session
      act(() => {
        result.current.actions.clearSession()
      })

      expect(result.current.currentSession).toBeNull()
      expect(result.current.transcript).toEqual([])
      expect(result.current.detections).toEqual([])
      expect(result.current.audioData).toBeNull()
      expect(result.current.volume).toBe(0)
      expect(result.current.isRecording).toBe(false)
    })

    it('should change visualizer theme', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        result.current.actions.changeTheme('neon')
      })

      expect(result.current.visualizerTheme).toBe('neon')

      act(() => {
        result.current.actions.changeTheme('minimal')
      })

      expect(result.current.visualizerTheme).toBe('minimal')
    })
  })

  describe('UIStore - User Interface State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useUIStore())
      
      expect(result.current.theme).toBe('light')
      expect(result.current.sidebarOpen).toBe(true)
      expect(result.current.activeModal).toBeNull()
      expect(result.current.notifications).toEqual([])
    })

    it('should toggle theme', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.setTheme('dark')
      })
      expect(result.current.theme).toBe('dark')

      act(() => {
        result.current.actions.setTheme('light')
      })
      expect(result.current.theme).toBe('light')
    })

    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.toggleSidebar()
      })
      expect(result.current.sidebarOpen).toBe(false)

      act(() => {
        result.current.actions.toggleSidebar()
      })
      expect(result.current.sidebarOpen).toBe(true)
    })

    it('should manage modal state', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.openModal('settings')
      })
      expect(result.current.activeModal).toBe('settings')

      act(() => {
        result.current.actions.closeModal()
      })
      expect(result.current.activeModal).toBeNull()
    })

    it('should add and remove notifications', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.addNotification({
          type: 'info',
          message: 'Test notification',
          duration: 5000
        })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].message).toBe('Test notification')
      expect(result.current.notifications[0].type).toBe('info')
      expect(result.current.notifications[0].id).toBeDefined()

      const notificationId = result.current.notifications[0].id!

      act(() => {
        result.current.actions.removeNotification(notificationId)
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should auto-remove notifications with duration', async () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.addNotification({
          type: 'success',
          message: 'Auto-remove test',
          duration: 100 // 100ms for quick test
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      // Wait for auto-removal
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(result.current.notifications).toHaveLength(0)
    })
  })

  describe('PerformanceStore - Metrics Tracking', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePerformanceStore())
      
      expect(result.current.metrics.renderCount).toBe(0)
      expect(result.current.metrics.averageFrameTime).toBe(16.67)
      expect(result.current.metrics.memoryUsage).toBe(0)
      expect(result.current.metrics.componentMounts).toBe(0)
    })

    it('should increment render count', () => {
      const { result } = renderHook(() => usePerformanceStore())

      act(() => {
        result.current.actions.incrementRender()
      })

      expect(result.current.metrics.renderCount).toBe(1)

      act(() => {
        result.current.actions.incrementRender()
      })

      expect(result.current.metrics.renderCount).toBe(2)
    })

    it('should update frame time with averaging', () => {
      const { result } = renderHook(() => usePerformanceStore())

      act(() => {
        result.current.actions.updateFrameTime(20)
      })

      // Should average with baseline 16.67
      expect(result.current.metrics.averageFrameTime).toBeCloseTo(18.335, 2)
    })

    it('should update memory usage', () => {
      const { result } = renderHook(() => usePerformanceStore())

      act(() => {
        result.current.actions.updateMemoryUsage(150.5)
      })

      expect(result.current.metrics.memoryUsage).toBe(150.5)
    })

    it('should increment component mounts', () => {
      const { result } = renderHook(() => usePerformanceStore())

      act(() => {
        result.current.actions.incrementMounts()
      })

      expect(result.current.metrics.componentMounts).toBe(1)
    })

    it('should reset all metrics', () => {
      const { result } = renderHook(() => usePerformanceStore())

      // Set some values first
      act(() => {
        result.current.actions.incrementRender()
        result.current.actions.updateFrameTime(25)
        result.current.actions.updateMemoryUsage(200)
        result.current.actions.incrementMounts()
      })

      expect(result.current.metrics.renderCount).toBe(1)

      // Reset
      act(() => {
        result.current.actions.reset()
      })

      expect(result.current.metrics.renderCount).toBe(0)
      expect(result.current.metrics.averageFrameTime).toBe(16.67)
      expect(result.current.metrics.memoryUsage).toBe(0)
      expect(result.current.metrics.componentMounts).toBe(0)
    })
  })

  describe('Store Selectors - Optimized Access', () => {
    it('should provide working audio selectors', () => {
      const { result } = renderHook(() => useAudioStore())

      expect(audioSelectors.isRecording(result.current)).toBe(false)
      expect(audioSelectors.audioData(result.current)).toBeNull()
      expect(audioSelectors.volume(result.current)).toBe(0)
      expect(audioSelectors.transcript(result.current)).toEqual([])
      expect(audioSelectors.detections(result.current)).toEqual([])
      expect(audioSelectors.theme(result.current)).toBe('default')
    })

    it('should provide working UI selectors', () => {
      const { result } = renderHook(() => useUIStore())

      expect(uiSelectors.theme(result.current)).toBe('light')
      expect(uiSelectors.sidebarOpen(result.current)).toBe(true)
      expect(uiSelectors.activeModal(result.current)).toBeNull()
      expect(uiSelectors.notifications(result.current)).toEqual([])
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complex audio session workflow', () => {
      const { result: audioResult } = renderHook(() => useAudioStore())
      const { result: uiResult } = renderHook(() => useUIStore())

      const mockSession = createMockSession()
      const mockAudioData = new Float32Array([0.2, -0.3, 0.4])
      const mockSegment = createMockTranscriptSegment()
      const mockDetection = createMockDetection()

      act(() => {
        // Start session workflow
        audioResult.current.actions.startRecording()
        uiResult.current.actions.addNotification({
          type: 'info',
          message: 'Recording started',
          duration: 3000
        })
      })

      expect(audioResult.current.isRecording).toBe(true)
      expect(uiResult.current.notifications).toHaveLength(1)

      act(() => {
        // Add audio data and transcript
        audioResult.current.actions.updateAudioData(mockAudioData)
        audioResult.current.actions.addTranscriptSegment(mockSegment)
        audioResult.current.actions.addDetection(mockDetection)
      })

      expect(audioResult.current.transcript).toHaveLength(1)
      expect(audioResult.current.detections).toHaveLength(1)
      expect(audioResult.current.volume).toBeGreaterThan(0)

      act(() => {
        // End session
        audioResult.current.actions.stopRecording()
        uiResult.current.actions.addNotification({
          type: 'success',
          message: 'Session completed',
          duration: 3000
        })
      })

      expect(audioResult.current.isRecording).toBe(false)
      expect(uiResult.current.notifications).toHaveLength(2)
    })

    it('should handle theme synchronization', () => {
      const { result: audioResult } = renderHook(() => useAudioStore())
      const { result: uiResult } = renderHook(() => useUIStore())

      act(() => {
        uiResult.current.actions.setTheme('dark')
        audioResult.current.actions.changeTheme('neon')
      })

      expect(uiResult.current.theme).toBe('dark')
      expect(audioResult.current.visualizerTheme).toBe('neon')
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle multiple rapid updates efficiently', () => {
      const { result } = renderHook(() => useAudioStore())
      const performanceStart = performance.now()

      act(() => {
        // Simulate rapid audio updates
        for (let i = 0; i < 100; i++) {
          const audioData = new Float32Array(Array.from({ length: 1024 }, () => Math.random() * 0.1))
          result.current.actions.updateAudioData(audioData)
        }
      })

      const performanceEnd = performance.now()
      const duration = performanceEnd - performanceStart

      expect(result.current.audioData).toBeDefined()
      expect(result.current.volume).toBeGreaterThan(0)
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should clean up large arrays properly', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        // Add large transcript and detection arrays
        for (let i = 0; i < 50; i++) {
          result.current.actions.addTranscriptSegment({
            ...createMockTranscriptSegment(),
            id: `segment-${i}`,
            text: `Segment ${i} text content`
          })
          result.current.actions.addDetection({
            ...createMockDetection(),
            id: `detection-${i}`,
            snippet: `Detection ${i} snippet`
          })
        }
      })

      expect(result.current.transcript).toHaveLength(50)
      expect(result.current.detections).toHaveLength(50)

      act(() => {
        result.current.actions.clearSession()
      })

      expect(result.current.transcript).toHaveLength(0)
      expect(result.current.detections).toHaveLength(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid audio data gracefully', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        // Empty audio data
        result.current.actions.updateAudioData(new Float32Array([]))
      })

      expect(result.current.volume).toBe(0)
      expect(result.current.audioData).toEqual(new Float32Array([]))
    })

    it('should handle extreme sensitivity values', () => {
      const { result } = renderHook(() => useAudioStore())

      act(() => {
        result.current.actions.updateSensitivity(-1)
      })
      expect(result.current.sensitivity).toBe(-1)

      act(() => {
        result.current.actions.updateSensitivity(2)
      })
      expect(result.current.sensitivity).toBe(2)
    })

    it('should handle notification cleanup edge cases', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.actions.addNotification({
          type: 'error',
          message: 'Test error',
          duration: 0 // No auto-remove
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      // Try to remove non-existent notification
      act(() => {
        result.current.actions.removeNotification('non-existent-id')
      })

      expect(result.current.notifications).toHaveLength(1)
    })
  })

  describe('Subscription and Reactivity', () => {
    it('should trigger re-renders on state changes', () => {
      const { result, rerender } = renderHook(() => useAudioStore())
      let renderCount = 0
      
      const TestComponent = () => {
        renderCount++
        useAudioStore(state => state.isRecording)
        return null
      }

      const { rerender: rerenderTest } = renderHook(() => TestComponent())
      
      const initialRenderCount = renderCount

      act(() => {
        result.current.actions.startRecording()
      })

      rerenderTest()
      
      expect(renderCount).toBeGreaterThan(initialRenderCount)
    })

    it('should support selective subscriptions', () => {
      const { result } = renderHook(() => {
        const isRecording = useAudioStore(state => state.isRecording)
        const volume = useAudioStore(state => state.volume)
        return { isRecording, volume }
      })

      expect(result.current.isRecording).toBe(false)
      expect(result.current.volume).toBe(0)

      act(() => {
        useAudioStore.getState().actions.startRecording()
      })

      expect(result.current.isRecording).toBe(true)
    })
  })
})