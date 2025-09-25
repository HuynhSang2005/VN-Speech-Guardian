/**
 * State Management Tests - P32 Todo 6
 * Mục đích: Focused Zustand store testing matching simplified interface
 * Tech: Zustand v5, simplified store testing without complex middleware
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAudioStore, useUIStore } from '../enhanced-stores-simple';

// Mock data factories matching simplified interfaces
const createMockSession = (overrides = {}) => ({
  id: 'session-123',
  name: 'Test Session',
  description: 'Test session description',
  startedAt: '2025-09-25T10:00:00Z',
  endedAt: undefined,
  lang: 'vi',
  ...overrides,
});

const createMockTranscriptSegment = (overrides = {}) => ({
  id: 'transcript-123',
  text: 'Hello world test transcript',
  timestamp: '2025-09-25T10:00:01Z',
  confidence: 0.95,
  ...overrides,
});

const createMockDetection = (overrides = {}) => ({
  id: 'detection-123',
  type: 'OFFENSIVE' as const,
  severity: 'medium' as const,
  confidence: 0.85,
  snippet: 'detected harmful content',
  timestamp: '2025-09-25T10:00:01Z',
  ...overrides,
});

// Test utilities
const generatePCMAudioData = (length: number = 1024, frequency: number = 440): Float32Array => {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / 44100) * 0.5;
  }
  return data;
};

describe('State Management - Audio Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAudioStore.getState().actions.clearSession();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useAudioStore.getState();
      
      expect(state.isRecording).toBe(false);
      expect(state.audioData).toBeNull();
      expect(state.volume).toBe(0);
      expect(state.sensitivity).toBe(0.5);
      expect(state.currentSession).toBeNull();
      expect(state.transcript).toEqual([]);
      expect(state.detections).toEqual([]);
      expect(state.visualizerTheme).toBe('default');
    });

    it('should provide all expected actions', () => {
      const { actions } = useAudioStore.getState();
      
      expect(typeof actions.startRecording).toBe('function');
      expect(typeof actions.stopRecording).toBe('function');
      expect(typeof actions.updateAudioData).toBe('function');
      expect(typeof actions.updateSensitivity).toBe('function');
      expect(typeof actions.addTranscriptSegment).toBe('function');
      expect(typeof actions.addDetection).toBe('function');
      expect(typeof actions.clearSession).toBe('function');
      expect(typeof actions.changeTheme).toBe('function');
    });
  });

  describe('Recording State Management', () => {
    it('should start recording correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      
      act(() => {
        result.current.actions.startRecording();
      });
      
      expect(result.current.isRecording).toBe(true);
    });

    it('should stop recording correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      
      // Start recording first
      act(() => {
        result.current.actions.startRecording();
      });
      
      expect(result.current.isRecording).toBe(true);
      
      // Then stop recording
      act(() => {
        result.current.actions.stopRecording();
      });
      
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('Audio Data Processing', () => {
    it('should update audio data and calculate volume correctly', async () => {
      const { result } = renderHook(() => useAudioStore());
      const audioData = generatePCMAudioData(1024, 440);
      
      act(() => {
        result.current.actions.updateAudioData(audioData);
      });
      
      expect(result.current.audioData).toBe(audioData);
      expect(result.current.volume).toBeGreaterThan(0);
      expect(result.current.volume).toBeLessThanOrEqual(1);
    });

    it('should handle empty audio data gracefully', () => {
      const { result } = renderHook(() => useAudioStore());
      const emptyData = new Float32Array(0);
      
      act(() => {
        result.current.actions.updateAudioData(emptyData);
      });
      
      expect(result.current.audioData).toBe(emptyData);
      expect(result.current.volume).toBe(0);
    });

    it('should calculate correct volume from audio amplitude', () => {
      const { result } = renderHook(() => useAudioStore());
      
      // Create audio data with known amplitude
      const audioData = new Float32Array(100);
      audioData.fill(0.2); // Fixed amplitude
      
      act(() => {
        result.current.actions.updateAudioData(audioData);
      });
      
      // Volume should be amplitude * 5, capped at 1
      const expectedVolume = Math.min(0.2 * 5, 1);
      expect(result.current.volume).toBe(expectedVolume);
    });
  });

  describe('Sensitivity Management', () => {
    it('should update sensitivity correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      const newSensitivity = 0.8;
      
      act(() => {
        result.current.actions.updateSensitivity(newSensitivity);
      });
      
      expect(result.current.sensitivity).toBe(newSensitivity);
    });

    it('should handle edge sensitivity values', () => {
      const { result } = renderHook(() => useAudioStore());
      
      // Test minimum sensitivity
      act(() => {
        result.current.actions.updateSensitivity(0);
      });
      expect(result.current.sensitivity).toBe(0);
      
      // Test maximum sensitivity
      act(() => {
        result.current.actions.updateSensitivity(1);
      });
      expect(result.current.sensitivity).toBe(1);
    });
  });

  describe('Transcript Management', () => {
    it('should add transcript segments correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      const segment = createMockTranscriptSegment();
      
      act(() => {
        result.current.actions.addTranscriptSegment(segment);
      });
      
      expect(result.current.transcript).toHaveLength(1);
      expect(result.current.transcript[0]).toEqual(segment);
    });

    it('should maintain transcript order with multiple segments', () => {
      const { result } = renderHook(() => useAudioStore());
      const segment1 = createMockTranscriptSegment({ id: 'segment-1', text: 'First segment' });
      const segment2 = createMockTranscriptSegment({ id: 'segment-2', text: 'Second segment' });
      
      act(() => {
        result.current.actions.addTranscriptSegment(segment1);
        result.current.actions.addTranscriptSegment(segment2);
      });
      
      expect(result.current.transcript).toHaveLength(2);
      expect(result.current.transcript[0]).toEqual(segment1);
      expect(result.current.transcript[1]).toEqual(segment2);
    });
  });

  describe('Detection Management', () => {
    it('should add detections correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      const detection = createMockDetection();
      
      act(() => {
        result.current.actions.addDetection(detection);
      });
      
      expect(result.current.detections).toHaveLength(1);
      expect(result.current.detections[0]).toEqual(detection);
    });

    it('should handle multiple detection types', () => {
      const { result } = renderHook(() => useAudioStore());
      const offensiveDetection = createMockDetection({ type: 'OFFENSIVE', severity: 'high' });
      const suspiciousDetection = createMockDetection({ type: 'SUSPICIOUS', severity: 'medium' });
      const safeDetection = createMockDetection({ type: 'SAFE', severity: 'low' });
      
      act(() => {
        result.current.actions.addDetection(offensiveDetection);
        result.current.actions.addDetection(suspiciousDetection);
        result.current.actions.addDetection(safeDetection);
      });
      
      expect(result.current.detections).toHaveLength(3);
      expect(result.current.detections[0].type).toBe('OFFENSIVE');
      expect(result.current.detections[1].type).toBe('SUSPICIOUS');
      expect(result.current.detections[2].type).toBe('SAFE');
    });
  });

  describe('Session Management', () => {
    it('should clear session and reset state correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      const session = createMockSession();
      const segment = createMockTranscriptSegment();
      const detection = createMockDetection();
      const audioData = generatePCMAudioData(1024);
      
      // Set up state with session data
      act(() => {
        result.current.actions.startRecording();
        result.current.actions.updateAudioData(audioData);
        result.current.actions.addTranscriptSegment(segment);
        result.current.actions.addDetection(detection);
      });
      
      // Verify state is populated
      expect(result.current.isRecording).toBe(true);
      expect(result.current.audioData).toBe(audioData);
      expect(result.current.transcript).toHaveLength(1);
      expect(result.current.detections).toHaveLength(1);
      
      // Clear session
      act(() => {
        result.current.actions.clearSession();
      });
      
      // Verify state is reset
      expect(result.current.isRecording).toBe(false);
      expect(result.current.audioData).toBeNull();
      expect(result.current.volume).toBe(0);
      expect(result.current.currentSession).toBeNull();
      expect(result.current.transcript).toEqual([]);
      expect(result.current.detections).toEqual([]);
    });
  });

  describe('Theme Management', () => {
    it('should change visualizer theme correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      
      // Test neon theme
      act(() => {
        result.current.actions.changeTheme('neon');
      });
      expect(result.current.visualizerTheme).toBe('neon');
      
      // Test minimal theme
      act(() => {
        result.current.actions.changeTheme('minimal');
      });
      expect(result.current.visualizerTheme).toBe('minimal');
      
      // Test back to default
      act(() => {
        result.current.actions.changeTheme('default');
      });
      expect(result.current.visualizerTheme).toBe('default');
    });
  });

  describe('Store Subscriptions', () => {
    it('should handle subscriptions correctly', () => {
      const { result } = renderHook(() => useAudioStore());
      let subscriptionCalled = false;
      let subscriptionValue: boolean | undefined;
      
      // Subscribe to recording state changes
      const unsubscribe = useAudioStore.subscribe(
        (state) => state.isRecording,
        (isRecording) => {
          subscriptionCalled = true;
          subscriptionValue = isRecording;
        }
      );
      
      // Change recording state
      act(() => {
        result.current.actions.startRecording();
      });
      
      // Give time for subscription to be called
      expect(subscriptionCalled).toBe(true);
      expect(subscriptionValue).toBe(true);
      
      unsubscribe();
    });
  });
});

describe('State Management - UI Store', () => {
  beforeEach(() => {
    // Reset UI store state
    const { actions } = useUIStore.getState();
    actions.setTheme('light');
    actions.closeModal();
    // Clear notifications
    const notifications = useUIStore.getState().notifications;
    notifications.forEach(n => actions.removeNotification(n.id));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useUIStore.getState();
      
      expect(state.theme).toBe('light');
      expect(state.sidebarOpen).toBe(true);
      expect(state.activeModal).toBeNull();
      expect(state.notifications).toEqual([]);
    });
  });

  describe('Theme Management', () => {
    it('should toggle between light and dark themes', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Switch to dark theme
      act(() => {
        result.current.actions.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');
      
      // Switch back to light theme
      act(() => {
        result.current.actions.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
    });
  });

  describe('Sidebar Management', () => {
    it('should toggle sidebar state correctly', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Initial state should be open
      expect(result.current.sidebarOpen).toBe(true);
      
      // Toggle sidebar
      act(() => {
        result.current.actions.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);
      
      // Toggle again
      act(() => {
        result.current.actions.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe('Modal Management', () => {
    it('should open and close modals correctly', () => {
      const { result } = renderHook(() => useUIStore());
      const modalId = 'test-modal';
      
      // Open modal
      act(() => {
        result.current.actions.openModal(modalId);
      });
      expect(result.current.activeModal).toBe(modalId);
      
      // Close modal
      act(() => {
        result.current.actions.closeModal();
      });
      expect(result.current.activeModal).toBeNull();
    });

    it('should handle multiple modal switches', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Open first modal
      act(() => {
        result.current.actions.openModal('modal-1');
      });
      expect(result.current.activeModal).toBe('modal-1');
      
      // Switch to second modal
      act(() => {
        result.current.actions.openModal('modal-2');
      });
      expect(result.current.activeModal).toBe('modal-2');
    });
  });

  describe('Notification Management', () => {
    it('should add notifications correctly', () => {
      const { result } = renderHook(() => useUIStore());
      const notification = {
        type: 'success' as const,
        message: 'Test notification',
        duration: 3000,
      };
      
      act(() => {
        result.current.actions.addNotification(notification);
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject(notification);
      expect(result.current.notifications[0].id).toBeDefined();
    });

    it('should remove notifications correctly', () => {
      const { result } = renderHook(() => useUIStore());
      const notification = {
        type: 'info' as const,
        message: 'Test notification to remove',
      };
      
      // Add notification
      act(() => {
        result.current.actions.addNotification(notification);
      });
      
      const notificationId = result.current.notifications[0].id;
      expect(result.current.notifications).toHaveLength(1);
      
      // Remove notification
      act(() => {
        result.current.actions.removeNotification(notificationId);
      });
      
      expect(result.current.notifications).toHaveLength(0);
    });

    it('should handle multiple notification types', () => {
      const { result } = renderHook(() => useUIStore());
      
      const notifications = [
        { type: 'success' as const, message: 'Success message' },
        { type: 'error' as const, message: 'Error message' },
        { type: 'warning' as const, message: 'Warning message' },
        { type: 'info' as const, message: 'Info message' },
      ];
      
      // Add all notifications
      act(() => {
        notifications.forEach(notification => {
          result.current.actions.addNotification(notification);
        });
      });
      
      expect(result.current.notifications).toHaveLength(4);
      notifications.forEach((notification, index) => {
        expect(result.current.notifications[index].type).toBe(notification.type);
        expect(result.current.notifications[index].message).toBe(notification.message);
      });
    });
  });
});

describe('State Management - Performance & Memory', () => {
  it('should handle rapid state updates efficiently', async () => {
    const { result } = renderHook(() => useAudioStore());
    const startTime = performance.now();
    
    // Perform rapid updates
    act(() => {
      for (let i = 0; i < 100; i++) {
        const audioData = generatePCMAudioData(256, 440 + i);
        result.current.actions.updateAudioData(audioData);
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (less than 100ms)
    expect(duration).toBeLessThan(100);
    expect(result.current.audioData).toBeDefined();
  });

  it('should handle large transcript arrays efficiently', () => {
    const { result } = renderHook(() => useAudioStore());
    
    act(() => {
      // Add many transcript segments
      for (let i = 0; i < 1000; i++) {
        const segment = createMockTranscriptSegment({
          id: `segment-${i}`,
          text: `Transcript segment number ${i}`,
        });
        result.current.actions.addTranscriptSegment(segment);
      }
    });
    
    expect(result.current.transcript).toHaveLength(1000);
    expect(result.current.transcript[0].id).toBe('segment-0');
    expect(result.current.transcript[999].id).toBe('segment-999');
  });

  it('should clean up resources when clearing session', () => {
    const { result } = renderHook(() => useAudioStore());
    
    // Ensure clean starting state
    act(() => {
      result.current.actions.clearSession();
    });
    
    // Fill store with data
    act(() => {
      result.current.actions.startRecording();
      result.current.actions.updateAudioData(generatePCMAudioData(8192));
      
      for (let i = 0; i < 50; i++) {
        result.current.actions.addTranscriptSegment(createMockTranscriptSegment({ id: `seg-${i}` }));
        result.current.actions.addDetection(createMockDetection({ id: `det-${i}` }));
      }
    });
    
    // Verify data is present
    expect(result.current.transcript).toHaveLength(50);
    expect(result.current.detections).toHaveLength(50);
    expect(result.current.audioData).toBeDefined();
    
    // Clear session
    act(() => {
      result.current.actions.clearSession();
    });
    
    // Verify all data is cleared
    expect(result.current.transcript).toEqual([]);
    expect(result.current.detections).toEqual([]);
    expect(result.current.audioData).toBeNull();
    expect(result.current.volume).toBe(0);
    expect(result.current.isRecording).toBe(false);
  });
});