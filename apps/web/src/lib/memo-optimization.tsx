/**
 * Mục đích: React.memo optimization utilities cho giảm re-render
 * Chiến lược: Shallow/deep comparison, custom comparison functions
 * Performance: Tăng tốc render performance với React.memo strategies
 */

import React, { memo, useMemo, useCallback } from 'react';
import type { ComponentType } from 'react';

// Deep equality check cho complex objects
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

// Shallow equality check (React.memo default behavior)
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

// Memo với shallow comparison
export function memoWithShallowCompare<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return memo(Component, shallowEqual);
}

// Memo với deep comparison (dùng cho complex objects)
export function memoWithDeepCompare<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return memo(Component, (prevProps, nextProps) => deepEqual(prevProps, nextProps));
}

// Memo với custom comparison function
export function memoWithCustomCompare<P extends object>(
  Component: ComponentType<P>,
  compareFunction: (prevProps: P, nextProps: P) => boolean
): ComponentType<P> {
  return memo(Component, compareFunction);
}

// Hook để tạo stable object references
export function useStableObject<T extends object>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}

// Hook để tạo stable array references
export function useStableArray<T>(arr: T[]): T[] {
  return useMemo(() => arr, arr);
}

// Hook để tạo stable callback với dependencies
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

// Performance monitoring cho memo components
export function createPerformanceMonitoredMemo<P extends object>(
  Component: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
    const startTime = performance.now();
    const areEqual = shallowEqual(prevProps, nextProps);
    const endTime = performance.now();
    
    console.log(`[${componentName}] Comparison took: ${endTime - startTime}ms, Skip render: ${areEqual}`);
    return areEqual;
  });

  MemoizedComponent.displayName = `Memo(${componentName})`;
  return MemoizedComponent;
}

// Utility để tạo optimized list component
export function createOptimizedListComponent<T>(
  ItemComponent: ComponentType<{ item: T; index: number }>,
  keyExtractor: (item: T, index: number) => string | number = (_: T, index: number) => index
) {
  const MemoizedItem = memo(ItemComponent, (prevProps, nextProps) => {
    return prevProps.item === nextProps.item && prevProps.index === nextProps.index;
  });

  return function OptimizedList({ 
    items, 
    ...props 
  }: { 
    items: T[];
    [key: string]: any;
  }) {
    return (
      <div {...props}>
        {items.map((item, index) => (
          <MemoizedItem 
            key={keyExtractor(item, index) || index}
            item={item}
            index={index}
          />
        ))}
      </div>
    );
  };
}

// Tối ưu cho form inputs
export const OptimizedInput = memo(({ 
  value, 
  onChange, 
  ...props 
}: { 
  value: string;
  onChange: (value: string) => void;
  [key: string]: any;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return <input value={value} onChange={handleChange} {...props} />;
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.onChange === nextProps.onChange;
});

// Tối ưu cho button components
export const OptimizedButton = memo(({ 
  onClick, 
  children, 
  disabled,
  ...props 
}: { 
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  [key: string]: any;
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [onClick, disabled]);

  return (
    <button onClick={handleClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
});

// Analytics helper cho memo performance
export interface MemoAnalytics {
  componentName: string;
  renderCount: number;
  skippedRenders: number;
  totalComparisons: number;
  averageComparisonTime: number;
}

const memoAnalytics = new Map<string, MemoAnalytics>();

export function getMemoAnalytics(componentName?: string): MemoAnalytics | Map<string, MemoAnalytics> {
  if (componentName) {
    return memoAnalytics.get(componentName) || {
      componentName,
      renderCount: 0,
      skippedRenders: 0,
      totalComparisons: 0,
      averageComparisonTime: 0
    };
  }
  return memoAnalytics;
}

export function resetMemoAnalytics(componentName?: string): void {
  if (componentName) {
    memoAnalytics.delete(componentName);
  } else {
    memoAnalytics.clear();
  }
}