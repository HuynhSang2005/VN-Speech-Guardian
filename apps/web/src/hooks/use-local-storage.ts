/**
 * Hook để sync state với localStorage
 * Modern React 19 patterns với proper serialization
 */
import { useCallback, useState } from 'react';
import type { 
  THookError 
} from '@/schemas';

// Basic types for this hook
type LocalStorageValue<T> = T | null;

interface UseLocalStorageOptions<T> {
  defaultValue?: T;
  serializer?: {
    parse: (value: string) => T;
    stringify: (value: T) => string;
  };
}

interface UseLocalStorageReturn<T> {
  value: LocalStorageValue<T>;
  setValue: (value: T | ((prev: T | null) => T)) => void;
  removeValue: () => void;
  loading: boolean;
  error: THookError | null;
}

// Default serializer
const defaultSerializer = {
  parse: JSON.parse,
  stringify: JSON.stringify
};

export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    defaultValue,
    serializer = defaultSerializer
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<THookError | null>(null);
  const [storedValue, setStoredValue] = useState<LocalStorageValue<T>>(() => {
    if (typeof window === 'undefined') {
      // SSR support
      return defaultValue ?? null;
    }

    try {
      setLoading(true);
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return serializer.parse(item);
    } catch (err) {
      const hookError: THookError = {
        message: `Failed to parse localStorage value for key "${key}"`,
        name: 'ParseError',
        timestamp: new Date(),
        code: err instanceof Error ? err.message : 'PARSE_ERROR'
      };
      setError(hookError);
      return defaultValue ?? null;
    } finally {
      setLoading(false);
    }
  });

  // Update localStorage when value changes
  const setValue = useCallback((value: T | ((prev: T | null) => T)) => {
    try {
      setLoading(true);
      setError(null);
      
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        if (valueToStore === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, serializer.stringify(valueToStore));
        }
      }
    } catch (err) {
      const hookError: THookError = {
        message: `Failed to set localStorage value for key "${key}"`,
        name: 'SetError',
        timestamp: new Date(),
        code: err instanceof Error ? err.message : 'SET_ERROR'
      };
      setError(hookError);
    } finally {
      setLoading(false);
    }
  }, [key, serializer, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      setStoredValue(null);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      const hookError: THookError = {
        message: `Failed to remove localStorage value for key "${key}"`,
        name: 'RemoveError',
        timestamp: new Date(),
        code: err instanceof Error ? err.message : 'REMOVE_ERROR'
      };
      setError(hookError);
    } finally {
      setLoading(false);
    }
  }, [key]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error
  };
}