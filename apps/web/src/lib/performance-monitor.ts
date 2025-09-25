/**
 * Comprehensive Performance Monitoring Service
 * - Web Vitals tracking (LCP, INP, CLS, TTFB, FCP)
 * - Bundle load analysis
 * - Runtime performance monitoring
 * - Real-time performance alerts
 */

import { useState, useEffect } from 'react'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import type { CLSMetric, FCPMetric, INPMetric, LCPMetric, TTFBMetric } from 'web-vitals'

// Performance thresholds (based on Web Vitals v5 recommendations)
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint (replaces FID)
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
} as const

// Performance score calculation
export function calculatePerformanceScore(metrics: {
  lcp?: number
  inp?: number
  cls?: number
  fcp?: number
  ttfb?: number
}): number {
  const scores: number[] = []

  // LCP score (25% weight)
  if (metrics.lcp !== undefined) {
    const lcpScore = metrics.lcp <= PERFORMANCE_THRESHOLDS.LCP.good ? 100 :
                    metrics.lcp <= PERFORMANCE_THRESHOLDS.LCP.needsImprovement ? 75 : 50
    scores.push(lcpScore * 0.25)
  }

  // INP score (25% weight) - thay thế FID
  if (metrics.inp !== undefined) {
    const inpScore = metrics.inp <= PERFORMANCE_THRESHOLDS.INP.good ? 100 :
                    metrics.inp <= PERFORMANCE_THRESHOLDS.INP.needsImprovement ? 75 : 50
    scores.push(inpScore * 0.25)
  }

  // CLS score (25% weight)
  if (metrics.cls !== undefined) {
    const clsScore = metrics.cls <= PERFORMANCE_THRESHOLDS.CLS.good ? 100 :
                    metrics.cls <= PERFORMANCE_THRESHOLDS.CLS.needsImprovement ? 75 : 50
    scores.push(clsScore * 0.25)
  }

  // FCP score (15% weight)
  if (metrics.fcp !== undefined) {
    const fcpScore = metrics.fcp <= PERFORMANCE_THRESHOLDS.FCP.good ? 100 :
                    metrics.fcp <= PERFORMANCE_THRESHOLDS.FCP.needsImprovement ? 75 : 50
    scores.push(fcpScore * 0.15)
  }

  // TTFB score (10% weight)
  if (metrics.ttfb !== undefined) {
    const ttfbScore = metrics.ttfb <= PERFORMANCE_THRESHOLDS.TTFB.good ? 100 :
                     metrics.ttfb <= PERFORMANCE_THRESHOLDS.TTFB.needsImprovement ? 75 : 50
    scores.push(ttfbScore * 0.1)
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0)) : 0
}

// Types
export interface PerformanceData {
  score: number
  metrics: Map<string, number>
  alerts: string[]
  bundleStats?: {
    totalSize: number
    loadTime: number
    chunks: number
  }
  memoryUsage?: {
    used: number
    total: number
    percentage: number
  }
  longTasks: number
  navigationTiming?: PerformanceNavigationTiming
}

export interface PerformanceConfig {
  reportingEndpoint?: string
  sampleRate?: number
  enableConsoleLog?: boolean
  alertThresholds?: Partial<typeof PERFORMANCE_THRESHOLDS>
}

/**
 * Main Performance Monitor class
 * Tracks Web Vitals, bundle performance, và runtime metrics
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number>()
  private alerts: string[] = []
  private config: Required<PerformanceConfig>
  private longTaskObserver?: PerformanceObserver
  private memoryMonitorInterval?: NodeJS.Timeout
  private isActive = false

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      reportingEndpoint: config.reportingEndpoint || '',
      sampleRate: config.sampleRate ?? 1.0,
      enableConsoleLog: config.enableConsoleLog ?? true,
      alertThresholds: { ...PERFORMANCE_THRESHOLDS, ...config.alertThresholds }
    }
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    this.initWebVitals()
    this.initLongTaskMonitoring()
    this.initMemoryMonitoring()
    this.initBundleAnalysis()

    if (this.config.enableConsoleLog) {
      console.log('🚀 Performance monitoring started')
    }
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isActive) return

    this.isActive = false
    // VI: safely disconnect observer nếu tồn tại và có disconnect method
    if (this.longTaskObserver && typeof this.longTaskObserver.disconnect === 'function') {
      this.longTaskObserver.disconnect()
    }
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
    }

    if (this.config.enableConsoleLog) {
      console.log('⏹️ Performance monitoring stopped')
    }
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initWebVitals(): void {
    onCLS(this.handleCLS.bind(this))
    onFCP(this.handleFCP.bind(this))
    onINP(this.handleINP.bind(this))
    onLCP(this.handleLCP.bind(this))
    onTTFB(this.handleTTFB.bind(this))
  }

  /**
   * Web Vitals handlers
   */
  private handleCLS(metric: CLSMetric): void {
    this.recordMetric('CLS', metric.value)
    this.checkThreshold('CLS', metric.value, PERFORMANCE_THRESHOLDS.CLS)
  }

  private handleFCP(metric: FCPMetric): void {
    this.recordMetric('FCP', metric.value)
    this.checkThreshold('FCP', metric.value, PERFORMANCE_THRESHOLDS.FCP)
  }

  private handleINP(metric: INPMetric): void {
    this.recordMetric('INP', metric.value)
    this.checkThreshold('INP', metric.value, PERFORMANCE_THRESHOLDS.INP)
  }

  private handleLCP(metric: LCPMetric): void {
    this.recordMetric('LCP', metric.value)
    this.checkThreshold('LCP', metric.value, PERFORMANCE_THRESHOLDS.LCP)
  }

  private handleTTFB(metric: TTFBMetric): void {
    this.recordMetric('TTFB', metric.value)
    this.checkThreshold('TTFB', metric.value, PERFORMANCE_THRESHOLDS.TTFB)
  }

  /**
   * Record metric value
   */
  private recordMetric(name: string, value: number): void {
    this.metrics.set(name, value)
    
    if (this.config.enableConsoleLog) {
      console.log(`📊 ${name}: ${value}`)
    }

    // Report to endpoint if configured
    if (this.config.reportingEndpoint && Math.random() < this.config.sampleRate) {
      this.sendToEndpoint({ name, value, timestamp: Date.now() })
    }
  }

  /**
   * Check threshold và tạo alerts
   */
  private checkThreshold(
    metricName: string, 
    value: number, 
    threshold: { good: number; needsImprovement: number }
  ): void {
    let alertMessage = ''

    if (metricName === 'CLS') {
      // CLS thì smaller is better
      if (value > threshold.needsImprovement) {
        alertMessage = `⚠️ ${metricName} poor: ${value} (threshold: ${threshold.needsImprovement})`
      } else if (value > threshold.good) {
        alertMessage = `⚡ ${metricName} needs improvement: ${value} (threshold: ${threshold.good})`
      }
    } else {
      // Các metrics khác thì smaller is better
      if (value > threshold.needsImprovement) {
        alertMessage = `⚠️ ${metricName} poor: ${value}ms (threshold: ${threshold.needsImprovement}ms)`
      } else if (value > threshold.good) {
        alertMessage = `⚡ ${metricName} needs improvement: ${value}ms (threshold: ${threshold.good}ms)`
      }
    }

    if (alertMessage) {
      this.alerts.push(alertMessage)
      if (this.config.enableConsoleLog) {
        console.warn(alertMessage)
      }
    }
  }

  /**
   * Initialize Long Task monitoring
   */
  private initLongTaskMonitoring(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const longTasks = list.getEntries()
        const currentCount = this.metrics.get('LONG_TASKS') || 0
        this.metrics.set('LONG_TASKS', currentCount + longTasks.length)

        longTasks.forEach((task) => {
          if (this.config.enableConsoleLog) {
            console.warn(`🐌 Long task detected: ${task.duration}ms`)
          }
        })
      })

      // VI: safely observe nếu method tồn tại
      if (this.longTaskObserver && typeof this.longTaskObserver.observe === 'function') {
        this.longTaskObserver.observe({ entryTypes: ['longtask'] })
      }
    } catch (error) {
      console.warn('Long task monitoring not supported:', error)
    }
  }

  /**
   * Initialize Memory monitoring
   */
  private initMemoryMonitoring(): void {
    if (!('memory' in performance)) return

    this.memoryMonitorInterval = setInterval(() => {
      const memory = (performance as any).memory
      if (memory) {
        const used = memory.usedJSHeapSize
        const total = memory.totalJSHeapSize
        const percentage = (used / total) * 100

        this.metrics.set('MEMORY_USED', used)
        this.metrics.set('MEMORY_TOTAL', total)
        this.metrics.set('MEMORY_PERCENTAGE', percentage)

        // Alert khi memory usage > 80%
        if (percentage > 80) {
          const alertMsg = `🧠 High memory usage: ${percentage.toFixed(1)}%`
          this.alerts.push(alertMsg)
          if (this.config.enableConsoleLog) {
            console.warn(alertMsg)
          }
        }
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Initialize Bundle analysis
   */
  private initBundleAnalysis(): void {
    // Track resource loading
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        let totalSize = 0
        let jsChunks = 0

        entries.forEach((entry) => {
          if (entry.name.includes('.js')) {
            jsChunks++
            // Estimate size từ transfer size
            totalSize += (entry as any).transferSize || 0
          }
        })

        if (jsChunks > 0) {
          this.metrics.set('BUNDLE_SIZE', totalSize)
          this.metrics.set('BUNDLE_CHUNKS', jsChunks)
        }
      })

      try {
        // VI: safely observe nếu method tồn tại
      if (resourceObserver && typeof resourceObserver.observe === 'function') {
        resourceObserver.observe({ entryTypes: ['resource'] })
      }
      } catch (error) {
        console.warn('Resource monitoring not supported:', error)
      }
    }
  }

  /**
   * Send data to reporting endpoint
   */
  private async sendToEndpoint(data: any): Promise<void> {
    if (!this.config.reportingEndpoint) return

    try {
      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      })

      if (!response.ok) {
        console.warn('Failed to send performance data:', response.statusText)
      }
    } catch (error) {
      console.warn('Error sending performance data:', error)
    }
  }

  /**
   * Get current performance data
   */
  getCurrentData(): PerformanceData {
    const metricsObj: Record<string, number> = {}
    // Convert Map values, handling undefined properly
    const lcp = this.metrics.get('LCP')
    const inp = this.metrics.get('INP') 
    const cls = this.metrics.get('CLS')
    const fcp = this.metrics.get('FCP')
    const ttfb = this.metrics.get('TTFB')

    if (lcp !== undefined) metricsObj.lcp = lcp
    if (inp !== undefined) metricsObj.inp = inp
    if (cls !== undefined) metricsObj.cls = cls
    if (fcp !== undefined) metricsObj.fcp = fcp
    if (ttfb !== undefined) metricsObj.ttfb = ttfb

    return {
      score: calculatePerformanceScore(metricsObj),
      metrics: this.metrics,
      alerts: [...this.alerts],
      bundleStats: {
        totalSize: this.metrics.get('BUNDLE_SIZE') || 0,
        loadTime: this.metrics.get('LCP') || 0,
        chunks: this.metrics.get('BUNDLE_CHUNKS') || 0
      },
      memoryUsage: {
        used: this.metrics.get('MEMORY_USED') || 0,
        total: this.metrics.get('MEMORY_TOTAL') || 0,
        percentage: this.metrics.get('MEMORY_PERCENTAGE') || 0
      },
      longTasks: this.metrics.get('LONG_TASKS') || 0,
      ...(performance.navigation && { navigationTiming: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming })
    }
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor({
  ...(process.env.VITE_PERFORMANCE_ENDPOINT && { reportingEndpoint: process.env.VITE_PERFORMANCE_ENDPOINT }),
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableConsoleLog: process.env.NODE_ENV === 'development'
})

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [data, setData] = useState<PerformanceData>(() => performanceMonitor.getCurrentData())

  useEffect(() => {
    // Start monitoring
    performanceMonitor.start()

    // Update data every 2 seconds
    const interval = setInterval(() => {
      setData(performanceMonitor.getCurrentData())
    }, 2000)

    return () => {
      clearInterval(interval)
      performanceMonitor.stop()
    }
  }, [])

  const clearAlerts = () => {
    performanceMonitor.clearAlerts()
    setData(performanceMonitor.getCurrentData())
  }

  return {
    data,
    clearAlerts,
    monitor: performanceMonitor
  }
}

// All exports handled above