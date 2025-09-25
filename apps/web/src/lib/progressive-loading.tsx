/**
 * Enhanced lazy loading patterns với conditional rendering
 * - Intersection Observer cho progressive loading
 * - Conditional imports based on user interactions
 * - Priority-based loading strategies
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ComponentType } from 'react'

// Intersection Observer hook cho lazy loading on scroll
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: {
    threshold?: number
    rootMargin?: string
    triggerOnce?: boolean
  } = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const elementRef = useRef<T>(null)

  const { threshold = 0.1, rootMargin = '50px', triggerOnce = true } = options

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        
        const isElementIntersecting = entry.isIntersecting
        setIsIntersecting(isElementIntersecting)

        if (isElementIntersecting && triggerOnce && !hasTriggered) {
          setHasTriggered(true)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  return {
    ref: elementRef,
    isIntersecting: triggerOnce ? hasTriggered : isIntersecting,
  }
}

// Progressive component loading hook
export function useProgressiveLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  options: {
    exportName?: string
    preload?: boolean
    priority?: 'high' | 'low' | 'idle'
  } = {}
) {
  const [Component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { exportName, preload = false, priority = 'low' } = options

  const loadComponent = useCallback(async () => {
    if (Component || loading) return

    setLoading(true)
    setError(null)

    try {
      let componentModule: any
      
      // Load based on priority
      if (priority === 'high') {
        componentModule = await importFn()
      } else if (priority === 'idle') {
        // Use requestIdleCallback if available
        if ('requestIdleCallback' in window) {
          await new Promise(resolve => {
            window.requestIdleCallback(() => resolve(undefined))
          })
        }
        componentModule = await importFn()
      } else {
        // Low priority - defer loading
        await new Promise(resolve => setTimeout(resolve, 100))
        componentModule = await importFn()
      }

      const loadedComponent = exportName 
        ? componentModule[exportName] 
        : componentModule.default

      setComponent(loadedComponent)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [Component, loading, importFn, exportName, priority])

  // Preload if requested
  useEffect(() => {
    if (preload) {
      loadComponent()
    }
  }, [preload, loadComponent])

  return {
    Component,
    loading,
    error,
    loadComponent,
  }
}

// Conditional rendering với user interaction patterns
export function useConditionalImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  options: {
    exportName?: string
    trigger?: 'hover' | 'click' | 'focus' | 'visible'
    delay?: number
  }
) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const { Component, loading, error, loadComponent } = useProgressiveLoading(importFn, {
    ...(options.exportName && { exportName: options.exportName }),
  })

  const triggerProps = {
    onMouseEnter: options.trigger === 'hover' ? () => {
      if (options.delay) {
        setTimeout(() => setShouldLoad(true), options.delay)
      } else {
        setShouldLoad(true)
      }
    } : undefined,
    onClick: options.trigger === 'click' ? () => setShouldLoad(true) : undefined,
    onFocus: options.trigger === 'focus' ? () => setShouldLoad(true) : undefined,
  }

  // Load component when shouldLoad becomes true
  useEffect(() => {
    if (shouldLoad) {
      loadComponent()
    }
  }, [shouldLoad, loadComponent])

  return {
    Component,
    loading,
    error,
    triggerProps,
    shouldLoad,
  }
}

// Lazy wrapper cho heavy dashboard components
export function LazyDashboardComponent({ 
  children,
  fallback = <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  })

  return (
    <div ref={ref} className="min-h-[200px]">
      {isIntersecting ? children : fallback}
    </div>
  )
}

// Heavy component loading với priority
export function PriorityLoader<T extends ComponentType<any>>({
  importFn,
  exportName,
  priority = 'low',
  fallback,
  ...props
}: {
  importFn: () => Promise<{ default: T } | { [key: string]: T }>
  exportName?: string
  priority?: 'high' | 'low' | 'idle'
  fallback?: React.ReactNode
} & Record<string, any>) {
  const { Component, loading, error } = useProgressiveLoading(importFn, {
    ...(exportName && { exportName }),
    priority,
    preload: priority === 'high',
  })

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load component</p>
      </div>
    )
  }

  if (loading || !Component) {
    return fallback || <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
  }

  return <Component {...(props as any)} />
}

// Analytics component với conditional loading
export function ConditionalAnalytics({ 
  shouldLoad = false,
  ...props 
}: { 
  shouldLoad?: boolean 
} & Record<string, any>) {
  const { Component, loading, error } = useConditionalImport(
    () => import('@/components/dashboard/AnalyticsCharts'),
    { exportName: 'AnalyticsCharts' }
  )

  useEffect(() => {
    if (shouldLoad && !Component && !loading) {
      // Trigger loading
    }
  }, [shouldLoad, Component, loading])

  if (!shouldLoad) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Charts will load when needed</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center">
        <p className="text-red-500">Failed to load analytics</p>
      </div>
    )
  }

  if (loading || !Component) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
    )
  }

  return <Component {...(props as any)} />
}

export default {
  useIntersectionObserver,
  useProgressiveLoading,
  useConditionalImport,
  LazyDashboardComponent,
  PriorityLoader,
  ConditionalAnalytics,
}