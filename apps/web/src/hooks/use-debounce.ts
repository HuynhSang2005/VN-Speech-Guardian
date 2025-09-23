/**
 * Hook để debounce values và callbacks
 * Modern React 19 với advanced debouncing options
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TDebounceOptions } from '@/schemas';

// Debounce value hook
export function useDebounce<T>(
  value: T,
  delay: number,
  options: Partial<TDebounceOptions> = {}
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const {
    leading = false,
    trailing = true,
    maxWait
  } = options;

  // Track if this is the first call
  const isFirstCallRef = useRef<boolean>(true);
  const lastCallTimeRef = useRef<number>(0);
  const maxTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const now = Date.now();
    
    // Handle leading edge
    if (leading && isFirstCallRef.current) {
      setDebouncedValue(value);
      isFirstCallRef.current = false;
      lastCallTimeRef.current = now;
      return;
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Set main timeout
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        lastCallTimeRef.current = Date.now();
        
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
        }
      }, delay);
    }

    // Set max wait timeout
    if (maxWait && (now - lastCallTimeRef.current) < maxWait) {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        lastCallTimeRef.current = Date.now();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }, maxWait - (now - lastCallTimeRef.current));
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing, maxWait]);

  return debouncedValue;
}

// Debounce callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: Partial<TDebounceOptions> = {}
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const argsRef = useRef<Parameters<T> | undefined>(undefined);
  
  const {
    leading = false,
    trailing = true,
    maxWait
  } = options;

  const isFirstCallRef = useRef<boolean>(true);
  const lastCallTimeRef = useRef<number>(0);
  const maxTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update callback ref on every render
  callbackRef.current = callback;

  // Execute callback immediately
  const executeCallback = useCallback(() => {
    if (argsRef.current) {
      callbackRef.current(...argsRef.current);
      lastCallTimeRef.current = Date.now();
    }
  }, []);

  // Debounced function
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    argsRef.current = args;
    const now = Date.now();

    // Handle leading edge
    if (leading && isFirstCallRef.current) {
      executeCallback();
      isFirstCallRef.current = false;
      return;
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Set main timeout
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        executeCallback();
        
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
        }
      }, delay);
    }

    // Set max wait timeout
    if (maxWait && (now - lastCallTimeRef.current) < maxWait) {
      maxTimeoutRef.current = setTimeout(() => {
        executeCallback();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }, maxWait - (now - lastCallTimeRef.current));
    }
  }, [delay, leading, trailing, maxWait, executeCallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
}

// Combined hook for convenience
export function useDebouncedState<T>(
  initialValue: T,
  delay: number,
  options: Partial<TDebounceOptions> = {}
): [T, T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay, options);

  const handleSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => 
      typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev)
        : newValue
    );
  }, []);

  return [value, debouncedValue, handleSetValue];
}

export default {
  useDebounce,
  useDebouncedCallback,
  useDebouncedState
};