/**
 * Hook để sync state với localStorage
 * Modern React 19 patterns với proper serialization
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import type { 
  TLocalStorageOptions,
  TTHookError 
} from '@/schemas';
import type { UseLocalStorageReturn } from '@/types/hooks';

// Basic types for this hook
type LocalStorageValue<T> = T | null;

// Default serializer
const defaultSerializer = {
  parse: JSON.parse,
  stringify: JSON.stringify
};

export function useLocalStorage<T>(
  key: string,
  options: TLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    defaultValue,
    serializer = defaultSerializer
  } = options;

  const [error, setError] = useState<THookError | null>(null);
  const [storedValue, setStoredValue] = useState<LocalStorageValue<T>>(() => {
    if (typeof window === 'undefined') {
      // SSR support
      return defaultValue ?? null;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return serializer.parse(item) as LocalStorageValue<T>;
    } catch (err) {
      const parseError: THookError = {
        message: err instanceof Error ? err.message : 'Failed to parse localStorage value',
        code: 'PARSE_ERROR',
        timestamp: Date.now()
      };
      setError(parseError);
      return defaultValue ?? null;
    }
  });

  const isInitialMount = useRef(true);

  // Update localStorage when storedValue changes
  useEffect(() => {
    // Skip on initial mount để tránh overwrite existing value
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window === 'undefined') {
      return; // SSR guard
    }

    try {
      if (storedValue === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, serializer.stringify(storedValue));
      }
      setError(null);
    } catch (err) {
      const saveError: THookError = {
        message: err instanceof Error ? err.message : 'Failed to save to localStorage',
        code: 'SAVE_ERROR',
        timestamp: Date.now()
      };
      setError(saveError);
    }
  }, [key, storedValue, serializer]);

  // Listen to localStorage changes từ other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = serializer.parse(e.newValue) as LocalStorageValue<T>;
          setStoredValue(newValue);
          setError(null);
        } catch (err) {
          const parseError: THookError = {
            message: err instanceof Error ? err.message : 'Failed to parse storage change',
            code: 'PARSE_ERROR',
            timestamp: Date.now()
          };
          setError(parseError);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, serializer]);

  // Set value với functional update support
  const setValue = useCallback((value: T | ((prev: T | null) => T)) => {
    try {
      const valueToStore = typeof value === 'function'
        ? (value as (prev: T | null) => T)(storedValue)
        : value;
      
      setStoredValue(valueToStore);
    } catch (err) {
      const updateError: THookError = {
        message: err instanceof Error ? err.message : 'Failed to update value',
        code: 'UPDATE_ERROR',
        timestamp: Date.now()
      };
      setError(updateError);
    }
  }, [storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    setStoredValue(null);
  }, []);

  return {
    value: storedValue,
    setValue,
    removeValue,
    error
  };
}

export default useLocalStorage;
