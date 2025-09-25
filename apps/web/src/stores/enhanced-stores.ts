/**
 * Enhanced Zustand Stores - P28 Implementation
 * Mục đích: Modern Zustand v5 stores với TypeScript subscriptions, persist middleware, devtools
 * Features: Subscriptions, persist, devtools, complex state management, performance optimization
 * Tech: Zustand v5, TypeScript subscriptions, middleware composition
 * 
 * Research sources:
 * - https://github.com/pmndrs/zustand (Zustand v5 patterns)
 * - Advanced subscription patterns, middleware composition
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { StateCreator } from 'zustand';
// TODO: Import proper types when available
// import type { Session, TranscriptSegment, Detection } from '../../types';

// Temporary type definitions for P28
interface Session {
  id: string;
  name: string;
  description?: string;
  startedAt: Date;
  endedAt?: Date;
  lang: string;
}

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

interface Detection {
  id: string;
  type: 'OFFENSIVE' | 'SUSPICIOUS' | 'SAFE';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  snippet: string;
  timestamp: Date;
}

// Enhanced subscription types for better TypeScript inference
type Subscriber<T> = (state: T, prevState: T) => void;
type Unsubscribe = () => void;

// Audio Store Interface với comprehensive state management
interface AudioState {
  // Core audio state
  isRecording: boolean;
  isProcessing: boolean;
  audioData: Float32Array | null;
  volume: number;
  sensitivity: number;
  sampleRate: number;
  
  // Session management
  currentSession: Session | null;
  sessionStatus: 'idle' | 'starting' | 'recording' | 'processing' | 'stopping' | 'error';
  
  // Real-time data
  transcript: TranscriptSegment[];
  detections: Detection[];
  partialTranscript: string;
  
  // UI state
  visualizerTheme: 'default' | 'neon' | 'minimal';
  showSettings: boolean;
  isConnected: boolean;
  
  // Performance metrics
  metrics: {
    latency: number;
    processingTime: number;
    accuracyScore: number;
    totalChunks: number;
  };
  
  // Error handling
  lastError: string | null;
  retryCount: number;
}

interface AudioActions {
  // Session actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  
  // Data updates
  updateAudioData: (data: Float32Array) => void;
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  updatePartialTranscript: (text: string) => void;
  addDetection: (detection: Detection) => void;
  
  // Settings
  updateSensitivity: (value: number) => void;
  changeTheme: (theme: 'default' | 'neon' | 'minimal') => void;
  toggleSettings: () => void;
  
  // Connection management
  setConnectionStatus: (connected: boolean) => void;
  
  // Error handling
  setError: (error: string) => void;
  clearError: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;
  
  // Metrics
  updateMetrics: (metrics: Partial<AudioState['metrics']>) => void;
  
  // Utility actions
  clearSession: () => void;
  resetState: () => void;
}

type AudioStore = AudioState & { actions: AudioActions };

// Enhanced Audio Store với middleware composition
const audioStoreCreator: StateCreator<
  AudioStore,
  [
    ['zustand/subscribeWithSelector', never],
    ['zustand/persist', unknown],
    ['zustand/devtools', never],
    ['zustand/immer', never]
  ],
  [],
  AudioStore
> = (set, get) => ({
  // Initial state
  isRecording: false,
  isProcessing: false,
  audioData: null,
  volume: 0,
  sensitivity: 0.5,
  sampleRate: 16000,
  
  currentSession: null,
  sessionStatus: 'idle',
  
  transcript: [],
  detections: [],
  partialTranscript: '',
  
  visualizerTheme: 'default',
  showSettings: false,
  isConnected: false,
  
  metrics: {
    latency: 0,
    processingTime: 0,
    accuracyScore: 0,
    totalChunks: 0,
  },
  
  lastError: null,
  retryCount: 0,
  
  actions: {
    startRecording: async () => {
      try {
        set((state) => {
          state.sessionStatus = 'starting';
          state.lastError = null;
        }, false, 'audio/startRecording/begin');
        
        // Simulate session creation
        const sessionId = `session-${Date.now()}`;
        const session: Session = {
          id: sessionId,
          name: `Recording ${new Date().toLocaleTimeString()}`,
          userId: 'current-user',
          device: navigator.userAgent,
          lang: 'vi',
          startedAt: new Date().toISOString(),
          endedAt: null,
        };
        
        set((state) => {
          state.isRecording = true;
          state.sessionStatus = 'recording';
          state.currentSession = session;
          state.transcript = [];
          state.detections = [];
          state.partialTranscript = '';
          state.retryCount = 0;
        }, false, 'audio/startRecording/success');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
        set((state) => {
          state.sessionStatus = 'error';
          state.lastError = errorMessage;
        }, false, 'audio/startRecording/error');
        
        throw error;
      }
    },
    
    stopRecording: async () => {
      try {
        set((state) => {
          state.sessionStatus = 'stopping';
        }, false, 'audio/stopRecording/begin');
        
        const { currentSession } = get();
        if (currentSession) {
          // Finalize session
          const updatedSession = {
            ...currentSession,
            endedAt: new Date().toISOString(),
          };
          
          set((state) => {
            state.currentSession = updatedSession;
          });
        }
        
        set((state) => {
          state.isRecording = false;
          state.isProcessing = false;
          state.sessionStatus = 'idle';
          state.audioData = null;
          state.volume = 0;
          state.partialTranscript = '';
        }, false, 'audio/stopRecording/success');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
        set((state) => {
          state.lastError = errorMessage;
          state.sessionStatus = 'error';
        }, false, 'audio/stopRecording/error');
      }
    },
    
    pauseRecording: () => {
      set((state) => {
        state.isRecording = false;
        state.sessionStatus = 'idle';
      }, false, 'audio/pauseRecording');
    },
    
    resumeRecording: () => {
      set((state) => {
        state.isRecording = true;
        state.sessionStatus = 'recording';
      }, false, 'audio/resumeRecording');
    },
    
    updateAudioData: (data: Float32Array) => {
      // Calculate volume from audio data với performance optimization
      const volume = data.reduce((sum, sample) => sum + Math.abs(sample), 0) / data.length;
      const normalizedVolume = Math.min(volume * 10, 1);
      
      set((state) => {
        state.audioData = data;
        state.volume = normalizedVolume;
        state.metrics.totalChunks += 1;
      }, false, 'audio/updateAudioData');
    },
    
    addTranscriptSegment: (segment: TranscriptSegment) => {
      set((state) => {
        state.transcript.push(segment);
        state.partialTranscript = '';
        state.isProcessing = false;
      }, false, 'audio/addTranscriptSegment');
    },
    
    updatePartialTranscript: (text: string) => {
      set((state) => {
        state.partialTranscript = text;
        state.isProcessing = true;
      }, false, 'audio/updatePartialTranscript');
    },
    
    addDetection: (detection: Detection) => {
      set((state) => {
        state.detections.push(detection);
      }, false, 'audio/addDetection');
    },
    
    updateSensitivity: (value: number) => {
      const clampedValue = Math.max(0, Math.min(1, value));
      set((state) => {
        state.sensitivity = clampedValue;
      }, false, 'settings/updateSensitivity');
    },
    
    changeTheme: (theme) => {
      set((state) => {
        state.visualizerTheme = theme;
      }, false, 'settings/changeTheme');
    },
    
    toggleSettings: () => {
      set((state) => {
        state.showSettings = !state.showSettings;
      }, false, 'ui/toggleSettings');
    },
    
    setConnectionStatus: (connected: boolean) => {
      set((state) => {
        state.isConnected = connected;
        if (connected) {
          state.lastError = null;
          state.retryCount = 0;
        }
      }, false, 'connection/setStatus');
    },
    
    setError: (error: string) => {
      set((state) => {
        state.lastError = error;
        state.sessionStatus = 'error';
      }, false, 'error/setError');
    },
    
    clearError: () => {
      set((state) => {
        state.lastError = null;
        if (state.sessionStatus === 'error') {
          state.sessionStatus = 'idle';
        }
      }, false, 'error/clearError');
    },
    
    incrementRetry: () => {
      set((state) => {
        state.retryCount += 1;
      }, false, 'error/incrementRetry');
    },
    
    resetRetry: () => {
      set((state) => {
        state.retryCount = 0;
      }, false, 'error/resetRetry');
    },
    
    updateMetrics: (metrics) => {
      set((state) => {
        Object.assign(state.metrics, metrics);
      }, false, 'metrics/update');
    },
    
    clearSession: () => {
      set((state) => {
        state.currentSession = null;
        state.transcript = [];
        state.detections = [];
        state.partialTranscript = '';
        state.audioData = null;
        state.volume = 0;
        state.isRecording = false;
        state.isProcessing = false;
        state.sessionStatus = 'idle';
        state.metrics = {
          latency: 0,
          processingTime: 0,
          accuracyScore: 0,
          totalChunks: 0,
        };
      }, false, 'audio/clearSession');
    },
    
    resetState: () => {
      set((state) => {
        // Reset everything except persisted settings
        const { sensitivity, visualizerTheme } = state;
        Object.assign(state, {
          isRecording: false,
          isProcessing: false,
          audioData: null,
          volume: 0,
          sensitivity,
          sampleRate: 16000,
          currentSession: null,
          sessionStatus: 'idle' as const,
          transcript: [],
          detections: [],
          partialTranscript: '',
          visualizerTheme,
          showSettings: false,
          isConnected: false,
          metrics: {
            latency: 0,
            processingTime: 0,
            accuracyScore: 0,
            totalChunks: 0,
          },
          lastError: null,
          retryCount: 0,
        });
      }, false, 'audio/resetState');
    },
  },
});

// Create enhanced Audio Store với full middleware stack
export const useAudioStore = create<AudioStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer(audioStoreCreator),
        {
          name: 'vn-speech-guardian-audio',
          partialize: (state) => ({
            // Only persist user preferences, not session data
            sensitivity: state.sensitivity,
            visualizerTheme: state.visualizerTheme,
            sampleRate: state.sampleRate,
          }),
          version: 1,
          migrate: (persistedState: any, version: number) => {
            // Handle store migrations for backward compatibility
            if (version === 0) {
              // Migrate from v0 to v1
              return {
                ...persistedState,
                sampleRate: persistedState.sampleRate || 16000,
              };
            }
            return persistedState;
          },
        }
      )
    ),
    { 
      name: 'AudioStore',
      enabled: process.env.NODE_ENV === 'development' 
    }
  )
);

// Enhanced selector hooks for performance optimization
export const useIsRecording = () => useAudioStore((state) => state.isRecording);
export const useSessionStatus = () => useAudioStore((state) => state.sessionStatus);
export const useAudioData = () => useAudioStore((state) => state.audioData);
export const useCurrentSession = () => useAudioStore((state) => state.currentSession);
export const useTranscript = () => useAudioStore((state) => state.transcript);
export const useDetections = () => useAudioStore((state) => state.detections);
export const usePartialTranscript = () => useAudioStore((state) => state.partialTranscript);
export const useAudioActions = () => useAudioStore((state) => state.actions);
export const useConnectionStatus = () => useAudioStore((state) => state.isConnected);
export const useAudioError = () => useAudioStore((state) => state.lastError);

// Computed selectors với memoization
export const useAudioStats = () => useAudioStore((state) => ({
  totalSegments: state.transcript.length,
  totalDetections: state.detections.length,
  highPriorityDetections: state.detections.filter(d => d.severity === 'HIGH').length,
  sessionDuration: state.currentSession 
    ? Date.now() - new Date(state.currentSession.startedAt).getTime()
    : 0,
  averageLatency: state.metrics.latency,
  processingEfficiency: state.metrics.totalChunks > 0 
    ? state.metrics.processingTime / state.metrics.totalChunks 
    : 0,
}));

// Advanced subscription patterns
export const useAudioSubscriptions = () => {
  React.useEffect(() => {
    // Subscribe to recording state changes
    const unsubscribeRecording = useAudioStore.subscribe(
      (state) => state.isRecording,
      (isRecording, prevRecording) => {
        if (isRecording && !prevRecording) {
          console.log('🎙️ Recording started');
          // Could trigger analytics, setup audio context, etc.
        } else if (!isRecording && prevRecording) {
          console.log('⏹️ Recording stopped');
          // Cleanup, save data, etc.
        }
      },
      { 
        fireImmediately: false,
        equalityFn: (a, b) => a === b 
      }
    );

    // Subscribe to new detections với severity filtering
    const unsubscribeDetections = useAudioStore.subscribe(
      (state) => state.detections,
      (detections, prevDetections) => {
        const newDetections = detections.slice(prevDetections.length);
        newDetections.forEach((detection) => {
          // Show notifications based on severity
          if (detection.severity === 'HIGH') {
            toast.error(`Critical content detected: ${detection.snippet}`);
          } else if (detection.severity === 'MEDIUM') {
            toast.warning(`Potentially harmful content: ${detection.snippet}`);
          }
        });
      },
      {
        fireImmediately: false,
        equalityFn: (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index]?.id)
      }
    );

    // Subscribe to connection status changes
    const unsubscribeConnection = useAudioStore.subscribe(
      (state) => state.isConnected,
      (isConnected) => {
        if (isConnected) {
          toast.success('Connected to processing server');
        } else {
          toast.error('Disconnected from server');
        }
      }
    );

    // Subscribe to errors
    const unsubscribeErrors = useAudioStore.subscribe(
      (state) => state.lastError,
      (error) => {
        if (error) {
          toast.error(error);
        }
      }
    );

    return () => {
      unsubscribeRecording();
      unsubscribeDetections();
      unsubscribeConnection();
      unsubscribeErrors();
    };
  }, []);
};

// UI Store for global UI state management
interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
    timestamp: number;
  }>;
  isLoading: boolean;
  loadingMessage: string;
}

interface UIActions {
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean, message?: string) => void;
}

type UIStore = UIState & { actions: UIActions };

export const useUIStore = create<UIStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          theme: 'system',
          sidebarOpen: true,
          activeModal: null,
          notifications: [],
          isLoading: false,
          loadingMessage: '',
          
          actions: {
            setTheme: (theme) => {
              set({ theme }, false, 'ui/setTheme');
              
              // Apply theme to document
              const root = document.documentElement;
              if (theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.toggle('dark', prefersDark);
              } else {
                root.classList.toggle('dark', theme === 'dark');
              }
            },
            
            toggleSidebar: () => {
              set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'ui/toggleSidebar');
            },
            
            setSidebarOpen: (open) => {
              set({ sidebarOpen: open }, false, 'ui/setSidebarOpen');
            },
            
            openModal: (modalId) => {
              set({ activeModal: modalId }, false, 'ui/openModal');
            },
            
            closeModal: () => {
              set({ activeModal: null }, false, 'ui/closeModal');
            },
            
            addNotification: (notification) => {
              const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const newNotification = {
                ...notification,
                id,
                timestamp: Date.now(),
              };
              
              set((state) => ({
                notifications: [...state.notifications, newNotification],
              }), false, 'ui/addNotification');
              
              // Auto-remove notification after duration
              if (notification.duration !== 0) {
                const duration = notification.duration || 5000;
                setTimeout(() => {
                  get().actions.removeNotification(id);
                }, duration);
              }
            },
            
            removeNotification: (id) => {
              set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id),
              }), false, 'ui/removeNotification');
            },
            
            clearNotifications: () => {
              set({ notifications: [] }, false, 'ui/clearNotifications');
            },
            
            setLoading: (loading, message = '') => {
              set({ isLoading: loading, loadingMessage: message }, false, 'ui/setLoading');
            },
          },
        }),
        {
          name: 'vn-speech-guardian-ui',
          partialize: (state) => ({
            theme: state.theme,
            sidebarOpen: state.sidebarOpen,
          }),
        }
      )
    ),
    { name: 'UIStore' }
  )
);

// UI Store selectors
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useActiveModal = () => useUIStore((state) => state.activeModal);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useIsLoading = () => useUIStore((state) => state.isLoading);
export const useUIActions = () => useUIStore((state) => state.actions);

// Combined store hook for cross-store operations
export const useCombinedStore = () => {
  const audioStore = useAudioStore();
  const uiStore = useUIStore();
  
  const combinedActions = React.useMemo(() => ({
    startSessionWithUI: async () => {
      uiStore.actions.setLoading(true, 'Starting recording session...');
      try {
        await audioStore.actions.startRecording();
        uiStore.actions.addNotification({
          type: 'success',
          message: 'Recording session started successfully',
          duration: 3000,
        });
      } catch (error) {
        uiStore.actions.addNotification({
          type: 'error',
          message: 'Failed to start recording session',
          duration: 5000,
        });
      } finally {
        uiStore.actions.setLoading(false);
      }
    },
    
    stopSessionWithUI: async () => {
      uiStore.actions.setLoading(true, 'Stopping recording session...');
      try {
        await audioStore.actions.stopRecording();
        uiStore.actions.openModal('session-summary');
        uiStore.actions.addNotification({
          type: 'info',
          message: 'Recording session completed',
          duration: 3000,
        });
      } catch (error) {
        uiStore.actions.addNotification({
          type: 'error',
          message: 'Failed to stop recording session',
          duration: 5000,
        });
      } finally {
        uiStore.actions.setLoading(false);
      }
    },
  }), [audioStore.actions, uiStore.actions]);
  
  return {
    audio: audioStore,
    ui: uiStore,
    actions: combinedActions,
  };
};