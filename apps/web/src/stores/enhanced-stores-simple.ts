/**
 * Enhanced Stores - P28 Simplified Implementation  
 * Mục đích: Basic Zustand v5 stores for P28 without complex middleware to fix build
 * Tech: Zustand v5, simplified architecture
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Simplified type definitions for P28 build
interface Session {
  id: string;
  name: string;
  description?: string;
  startedAt: string;
  endedAt?: string;
  lang: string;
}

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: string;
  confidence: number;
}

interface Detection {
  id: string;
  type: 'OFFENSIVE' | 'SUSPICIOUS' | 'SAFE';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  snippet: string;
  timestamp: string;
}

// Audio Store Interface
interface AudioStore {
  // State
  isRecording: boolean;
  audioData: Float32Array | null;
  volume: number;
  sensitivity: number;
  currentSession: Session | null;
  transcript: TranscriptSegment[];
  detections: Detection[];
  visualizerTheme: 'default' | 'neon' | 'minimal';
  
  // Actions
  actions: {
    startRecording: () => void;
    stopRecording: () => void;
    updateAudioData: (data: Float32Array) => void;
    updateSensitivity: (sensitivity: number) => void;
    addTranscriptSegment: (segment: TranscriptSegment) => void;
    addDetection: (detection: Detection) => void;
    clearSession: () => void;
    changeTheme: (theme: 'default' | 'neon' | 'minimal') => void;
  };
}

// UI Store Interface  
interface UIStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
  
  actions: {
    setTheme: (theme: 'light' | 'dark') => void;
    toggleSidebar: () => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addNotification: (notification: Omit<UIStore['notifications'][0], 'id'>) => void;
    removeNotification: (id: string) => void;
  };
}

// Audio Store Implementation
export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set) => ({
    // Initial State
    isRecording: false,
    audioData: null,
    volume: 0,
    sensitivity: 0.5,
    currentSession: null,
    transcript: [],
    detections: [],
    visualizerTheme: 'default',
    
    // Actions
    actions: {
      startRecording: () => {
        set({ isRecording: true });
      },
      
      stopRecording: () => {
        set({ isRecording: false });
      },
      
      updateAudioData: (data: Float32Array) => {
        const avgAmplitude = data.reduce((sum, val) => sum + Math.abs(val), 0) / data.length;
        const volume = Math.min(avgAmplitude * 5, 1);
        
        set({ 
          audioData: data,
          volume: volume
        });
      },
      
      updateSensitivity: (sensitivity: number) => {
        set({ sensitivity });
      },
      
      addTranscriptSegment: (segment: TranscriptSegment) => {
        set((state) => ({
          transcript: [...state.transcript, segment]
        }));
      },
      
      addDetection: (detection: Detection) => {
        set((state) => ({
          detections: [...state.detections, detection]
        }));
      },
      
      clearSession: () => {
        set({
          currentSession: null,
          transcript: [],
          detections: [],
          audioData: null,
          volume: 0,
          isRecording: false
        });
      },
      
      changeTheme: (theme: 'default' | 'neon' | 'minimal') => {
        set({ visualizerTheme: theme });
      }
    }
  }))
);

// UI Store Implementation
export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    // Initial State
    theme: 'light',
    sidebarOpen: true,
    activeModal: null,
    notifications: [],
    
    // Actions
    actions: {
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
      },
      
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      openModal: (modalId: string) => {
        set({ activeModal: modalId });
      },
      
      closeModal: () => {
        set({ activeModal: null });
      },
      
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id }]
        }));
        
        // Auto-remove notification after duration
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            set((state) => ({
              notifications: state.notifications.filter(n => n.id !== id)
            }));
          }, notification.duration);
        }
      },
      
      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }
    }
  }))
);

// P28 Performance Store for monitoring
interface PerformanceStore {
  metrics: {
    renderCount: number;
    averageFrameTime: number;
    memoryUsage: number;
    componentMounts: number;
  };
  
  actions: {
    incrementRender: () => void;
    updateFrameTime: (time: number) => void;
    updateMemoryUsage: (usage: number) => void;
    incrementMounts: () => void;
    reset: () => void;
  };
}

export const usePerformanceStore = create<PerformanceStore>()((set) => ({
  metrics: {
    renderCount: 0,
    averageFrameTime: 16.67, // 60fps baseline
    memoryUsage: 0,
    componentMounts: 0,
  },
  
  actions: {
    incrementRender: () => {
      set((state) => ({
        metrics: {
          ...state.metrics,
          renderCount: state.metrics.renderCount + 1
        }
      }));
    },
    
    updateFrameTime: (time: number) => {
      set((state) => ({
        metrics: {
          ...state.metrics,
          averageFrameTime: (state.metrics.averageFrameTime + time) / 2
        }
      }));
    },
    
    updateMemoryUsage: (usage: number) => {
      set((state) => ({
        metrics: {
          ...state.metrics,
          memoryUsage: usage
        }
      }));
    },
    
    incrementMounts: () => {
      set((state) => ({
        metrics: {
          ...state.metrics,
          componentMounts: state.metrics.componentMounts + 1
        }
      }));
    },
    
    reset: () => {
      set({
        metrics: {
          renderCount: 0,
          averageFrameTime: 16.67,
          memoryUsage: 0,
          componentMounts: 0,
        }
      });
    }
  }
}));

// Selectors for optimized component subscriptions
export const audioSelectors = {
  isRecording: (state: AudioStore) => state.isRecording,
  audioData: (state: AudioStore) => state.audioData,
  volume: (state: AudioStore) => state.volume,
  transcript: (state: AudioStore) => state.transcript,
  detections: (state: AudioStore) => state.detections,
  theme: (state: AudioStore) => state.visualizerTheme,
};

export const uiSelectors = {
  theme: (state: UIStore) => state.theme,
  sidebarOpen: (state: UIStore) => state.sidebarOpen,
  activeModal: (state: UIStore) => state.activeModal,
  notifications: (state: UIStore) => state.notifications,
};

// Export types for P28 components
export type { AudioStore, UIStore, PerformanceStore, Session, TranscriptSegment, Detection };