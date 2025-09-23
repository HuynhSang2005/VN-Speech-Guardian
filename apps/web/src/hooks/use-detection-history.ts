/**
 * Hook để quản lý detection history và state
 * Modern React 19 với efficient state management
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { 
  TDetection, 
  TDetectionHistoryState,
  THookError 
} from '@/schemas';
import type { 
  UseDetectionHistoryOptions, 
  UseDetectionHistoryReturn 
} from '@/types/hooks';

export function useDetectionHistory(
  options: UseDetectionHistoryOptions = {}
): UseDetectionHistoryReturn {
  const {
    maxHistory = 1000,
    recentTimeWindow = 300000, // 5 minutes
    blockThreshold = 5,
    autoCleanup = true,
    persistToStorage = false,
    storageKey = 'detection-history'
  } = options;

  const [state, setState] = useState<DetectionHistoryState>(() => {
    // Initialize state từ localStorage if enabled
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedState = JSON.parse(stored) as { detections?: Detection[], totalCount?: number };
          return {
            detections: parsedState.detections ?? [],
            totalCount: parsedState.totalCount ?? 0,
            recentCount: 0, // Will be recalculated
            isBlocked: false // Will be recalculated
          };
        }
      } catch (err) {
        console.warn('Failed to load detection history from storage:', err);
      }
    }

    return {
      detections: [],
      totalCount: 0,
      recentCount: 0,
      isBlocked: false
    };
  });

  const [error, setError] = useState<HookError | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID cho detection
  const generateId = useCallback((): string => {
    return `detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate recent detections
  const recentDetections = useMemo(() => {
    const now = Date.now();
    return state.detections.filter(detection => 
      now - detection.timestamp <= recentTimeWindow
    );
  }, [state.detections, recentTimeWindow]);

  // Calculate recent harmful count
  const recentHarmfulCount = useMemo(() => {
    return recentDetections.filter(detection => 
      detection.category === 'HARMFUL'
    ).length;
  }, [recentDetections]);

  // Calculate block score (0-1, với 1 là fully blocked)
  const blockScore = useMemo(() => {
    if (blockThreshold <= 0) return 0;
    return Math.min(recentHarmfulCount / blockThreshold, 1);
  }, [recentHarmfulCount, blockThreshold]);

  // Update computed values in state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      recentCount: recentDetections.length,
      isBlocked: recentHarmfulCount >= blockThreshold
    }));
  }, [recentDetections.length, recentHarmfulCount, blockThreshold]);

  // Persist to storage
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          detections: state.detections,
          totalCount: state.totalCount
        }));
      } catch (err) {
        const storageError: HookError = {
          message: err instanceof Error ? err.message : 'Failed to save to storage',
          code: 'STORAGE_ERROR',
          timestamp: Date.now()
        };
        setError(storageError);
      }
    }
  }, [state.detections, state.totalCount, persistToStorage, storageKey]);

  // Auto cleanup old detections
  useEffect(() => {
    if (!autoCleanup) return;

    const cleanup = () => {
      setState(prev => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours
        
        const filteredDetections = prev.detections.filter(detection =>
          now - detection.timestamp <= oneDay
        );

        // Only update if there are changes
        if (filteredDetections.length !== prev.detections.length) {
          return {
            ...prev,
            detections: filteredDetections
          };
        }

        return prev;
      });
    };

    // Run cleanup every hour
    const interval = 60 * 60 * 1000; // 1 hour
    cleanupIntervalRef.current = setInterval(cleanup, interval);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [autoCleanup]);

  // Add new detection
  const addDetection = useCallback((detectionData: Omit<Detection, 'id' | 'timestamp'>) => {
    const detection: Detection = {
      ...detectionData,
      id: generateId(),
      timestamp: Date.now()
    };

    setState(prev => {
      let newDetections = [...prev.detections, detection];
      
      // Trim detections if exceeded maxHistory
      if (newDetections.length > maxHistory) {
        newDetections = newDetections.slice(-maxHistory);
      }

      return {
        ...prev,
        detections: newDetections,
        totalCount: prev.totalCount + 1
      };
    });

    setError(null);
  }, [generateId, maxHistory]);

  // Remove detection by ID
  const removeDetection = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      detections: prev.detections.filter(detection => detection.id !== id)
    }));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      detections: [],
      totalCount: 0,
      recentCount: 0,
      isBlocked: false
    }));

    // Clear from storage if enabled
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.warn('Failed to clear storage:', err);
      }
    }
  }, [persistToStorage, storageKey]);

  // Clear only recent detections
  const clearRecent = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      detections: prev.detections.filter(detection => 
        now - detection.timestamp > recentTimeWindow
      )
    }));
  }, [recentTimeWindow]);

  return {
    state,
    addDetection,
    removeDetection,
    clearHistory,
    clearRecent,
    recentHarmfulCount,
    blockScore,
    error
  };
}

export default useDetectionHistory;