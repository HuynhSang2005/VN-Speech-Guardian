/**
 * Hook để quản lý detection history và state
 * Modern React 19 với efficient state management
 */
import { useCallback, useEffect, useState } from 'react';
import type { 
  THookError 
} from '@/schemas';
import type { 
  UseDetectionHistoryOptions, 
  UseDetectionHistoryReturn,
  DetectionHistoryEntry 
} from '@/types/hooks';

export function useDetectionHistory(
  options: UseDetectionHistoryOptions = {}
): UseDetectionHistoryReturn {
  const {
    maxEntries = 1000,
    autoCleanup = true,
    persistToStorage = false
  } = options;

  const [history, setHistory] = useState<DetectionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<THookError | null>(null);

  // Add entry to history
  const addEntry = useCallback((entry: Omit<DetectionHistoryEntry, 'id' | 'timestamp'>) => {
    try {
      const newEntry: DetectionHistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date()
      };

      setHistory(prev => {
        const updated = [newEntry, ...prev];
        if (updated.length > maxEntries) {
          return updated.slice(0, maxEntries);
        }
        return updated;
      });

      setError(null);
    } catch (err) {
      const hookError: THookError = {
        message: 'Failed to add detection history entry',
        name: 'DetectionHistoryError',
        timestamp: new Date(),
        code: err instanceof Error ? err.message : 'UNKNOWN_ERROR'
      };
      setError(hookError);
    }
  }, [maxEntries]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setError(null);
  }, []);

  // Get entries by type
  const getByType = useCallback((type: string) => {
    return history.filter(entry => entry.type === type);
  }, [history]);

  // Get recent entries
  const getRecent = useCallback((count: number) => {
    return history.slice(0, count);
  }, [history]);

  // Cleanup old entries if enabled
  useEffect(() => {
    if (!autoCleanup) return;

    const cleanup = () => {
      setHistory(prev => prev.slice(0, maxEntries));
    };

    const interval = setInterval(cleanup, 60000); // Clean every minute
    return () => clearInterval(interval);
  }, [autoCleanup, maxEntries]);

  // Persist to storage if enabled
  useEffect(() => {
    if (!persistToStorage || typeof window === 'undefined') return;

    try {
      localStorage.setItem('detection-history', JSON.stringify(history));
    } catch (err) {
      console.warn('Failed to persist detection history:', err);
    }
  }, [history, persistToStorage]);

  // Load from storage on mount
  useEffect(() => {
    if (!persistToStorage || typeof window === 'undefined') return;

    try {
      setLoading(true);
      const stored = localStorage.getItem('detection-history');
      if (stored) {
        const parsedHistory = JSON.parse(stored) as DetectionHistoryEntry[];
        setHistory(parsedHistory);
      }
    } catch (err) {
      const hookError: THookError = {
        message: 'Failed to load detection history from storage',
        name: 'StorageError',
        timestamp: new Date(),
        code: err instanceof Error ? err.message : 'STORAGE_ERROR'
      };
      setError(hookError);
    } finally {
      setLoading(false);
    }
  }, [persistToStorage]);

  return {
    history,
    addEntry,
    clearHistory,
    getByType,
    getRecent,
    loading,
    error
  };
}