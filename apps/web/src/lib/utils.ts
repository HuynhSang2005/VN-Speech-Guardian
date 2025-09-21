/**
 * Utility functions cho VN Speech Guardian Frontend
 * Core utilities theo frontend.instructions.md patterns
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { 
  TDetectionLabel, 
  IAppError, 
  TErrorCode,
  IAudioConfig 
} from '@/types'
import { 
  ERROR_MESSAGES, 
  AUDIO_CONFIG,
  MODERATION_CONFIG 
} from '@/constants'

// =============================================================================
// CSS & Styling Utilities
// =============================================================================

/**
 * Combines clsx and tailwind-merge cho optimal CSS class handling
 * Sử dụng trong component styling với conditional classes
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates CSS variables từ design tokens
 * Chuyển đổi design system values thành CSS custom properties
 */
export function generateCSSVariables(tokens: Record<string, any>, prefix = ''): string {
  return Object.entries(tokens)
    .map(([key, value]) => {
      const cssVar = prefix ? `--${prefix}-${key}` : `--${key}`
      
      if (typeof value === 'object' && value !== null) {
        return generateCSSVariables(value, prefix ? `${prefix}-${key}` : key)
      }
      
      return `${cssVar}: ${value};`
    })
    .join('\n')
}

// =============================================================================
// Audio Processing Utilities
// =============================================================================

/**
 * Creates AudioContext với cross-browser compatibility
 * Handles vendor prefixes và browser differences
 */
export function getAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  
  if (!AudioContextClass) {
    throw new Error(ERROR_MESSAGES.AUDIO_NOT_SUPPORTED)
  }
  
  return new AudioContextClass()
}

/**
 * Converts Float32Array audio data to PCM16
 * Chuẩn hóa audio format cho backend processing
 */
export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length)
  
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] range and convert to 16-bit
    const sample = Math.max(-1, Math.min(1, float32Array[i]))
    pcm16[i] = sample * 0x7FFF
  }
  
  return pcm16
}

/**
 * Calculates audio energy level cho voice activity detection
 * Returns normalized energy value (0-1)
 */
export function calculateAudioEnergy(audioData: Float32Array): number {
  let sum = 0
  
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i]
  }
  
  const rms = Math.sqrt(sum / audioData.length)
  
  // Normalize to 0-1 range với logarithmic scaling
  return Math.min(1, Math.max(0, Math.log10(rms * 10 + 1)))
}

/**
 * Validates audio configuration
 * Kiểm tra tính hợp lệ của audio settings
 */
export function validateAudioConfig(config: Partial<IAudioConfig>): IAudioConfig {
  return {
    sampleRate: config.sampleRate || AUDIO_CONFIG.SAMPLE_RATES.SPEECH_RECOGNITION,
    channels: config.channels || AUDIO_CONFIG.CHANNELS,
    bitDepth: config.bitDepth || AUDIO_CONFIG.BIT_DEPTH,
    chunkSize: config.chunkSize || AUDIO_CONFIG.CHUNK_SIZE,
    vadThreshold: Math.max(0, Math.min(1, config.vadThreshold || AUDIO_CONFIG.VAD.THRESHOLD)),
  }
}

// =============================================================================
// Detection & Moderation Utilities
// =============================================================================

/**
 * Maps detection score to severity level
 * Ánh xạ confidence score thành mức độ nghiêm trọng
 */
export function getDetectionSeverity(
  label: TDetectionLabel, 
  score: number
): 'low' | 'medium' | 'high' {
  const { THRESHOLDS } = MODERATION_CONFIG
  
  // Safe content is always low severity
  if (label === 'SAFE') return 'low'
  
  // High severity labels
  if (['HATE_SPEECH', 'TOXIC'].includes(label)) {
    return score >= THRESHOLDS.BLOCK ? 'high' : 'medium'
  }
  
  // Medium severity based on score
  if (score >= THRESHOLDS.BLOCK) return 'high'
  if (score >= THRESHOLDS.WARN) return 'medium'
  
  return 'low'
}

/**
 * Applies hysteresis smoothing to detection results
 * Giảm false positives bằng cách smooth detection results
 */
export function applyHysteresis(
  recentDetections: TDetectionLabel[],
  windowSize: number = MODERATION_CONFIG.HYSTERESIS.WINDOW_SIZE
): TDetectionLabel {
  if (recentDetections.length === 0) return 'SAFE'
  
  // Take last windowSize detections
  const window = recentDetections.slice(-windowSize)
  
  // Count occurrences của mỗi label
  const counts = window.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<TDetectionLabel, number>)
  
  // Return most frequent label
  return Object.entries(counts)
    .reduce((max, [label, count]) => 
      count > (counts[max as TDetectionLabel] || 0) ? label as TDetectionLabel : max,
      'SAFE' as TDetectionLabel
    )
}

/**
 * Generates detection alert message
 * Tạo thông báo phù hợp cho từng loại detection
 */
export function getDetectionMessage(
  label: TDetectionLabel,
  severity: 'low' | 'medium' | 'high'
): string {
  const labelInfo = MODERATION_CONFIG.LABELS[label]
  
  switch (severity) {
    case 'high':
      return `⚠️ Phát hiện ${labelInfo.label.toLowerCase()} mức độ cao`
    case 'medium':  
      return `⚡ Cảnh báo ${labelInfo.label.toLowerCase()}`
    case 'low':
      return `ℹ️ Ghi nhận ${labelInfo.label.toLowerCase()}`
    default:
      return `Phát hiện ${labelInfo.label.toLowerCase()}`
  }
}

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Creates standardized application error
 * Factory function cho consistent error objects
 */
export function createAppError(
  code: TErrorCode,
  message?: string,
  context?: Record<string, any>
): IAppError {
  const error = new Error(message || ERROR_MESSAGES[code]) as IAppError
  
  error.code = code
  error.context = context
  error.timestamp = new Date()
  
  return error
}

/**
 * Extracts error message với fallback
 * Safe error message extraction với Vietnamese support
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message)
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Determines if error is retryable
 * Kiểm tra xem error có thể retry được không
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableErrors = [
      'NetworkError',
      'TimeoutError', 
      'ConnectionError',
      'WEBSOCKET_CONNECTION_FAILED',
      'API_REQUEST_FAILED'
    ]
    
    return retryableErrors.some(retryable => 
      error.message.includes(retryable) || 
      (error as IAppError).code?.includes(retryable)
    )
  }
  
  return false
}

// =============================================================================
// Data Processing Utilities
// =============================================================================

/**
 * Deep clones object safely
 * Performs safe deep copy cho complex objects
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    
    return cloned
  }
  
  return obj
}

/**
 * Debounces function calls
 * Prevents excessive function calls trong high-frequency events
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Throttles function calls
 * Limits function execution rate cho performance
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Formats duration in milliseconds to readable string
 * Converts milliseconds thành human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }
  
  if (minutes > 0) {
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }
  
  return `0:${seconds.toString().padStart(2, '0')}`
}

/**
 * Formats confidence score as percentage
 * Converts 0-1 confidence to percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/**
 * Formats timestamp to Vietnamese locale
 * Localized datetime formatting
 */
export function formatTimestamp(date: Date | string | number): string {
  const d = new Date(date)
  
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Truncates text với ellipsis
 * Smart text truncation với word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  
  // Try to break at word boundary
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 0 && lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validates email format
 * Vietnamese-aware email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates URL format  
 * URL validation với protocol support
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Checks if value is empty
 * Comprehensive empty check cho various types
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  
  return false
}

// =============================================================================
// Browser & Environment Utilities  
// =============================================================================

/**
 * Detects if running in development mode
 * Environment detection utility
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV
}

/**
 * Detects browser support for required features
 * Feature detection cho audio processing capabilities
 */
export function checkBrowserSupport(): {
  webAudio: boolean
  mediaRecorder: boolean
  webWorkers: boolean
  audioWorklet: boolean
} {
  return {
    webAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
    mediaRecorder: !!(window.MediaRecorder),
    webWorkers: !!(window.Worker),
    audioWorklet: !!(window.AudioContext && AudioContext.prototype.audioWorklet),
  }
}

/**
 * Gets user agent information
 * Browser detection cho compatibility handling
 */
export function getUserAgent(): {
  browser: string
  version: string
  os: string
  mobile: boolean
} {
  const ua = navigator.userAgent
  
  // Simple browser detection
  let browser = 'Unknown'
  let version = 'Unknown'
  
  if (ua.includes('Chrome')) {
    browser = 'Chrome'
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox' 
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Safari')) {
    browser = 'Safari'
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown'
  }
  
  // OS detection
  let os = 'Unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS')) os = 'iOS'
  
  return {
    browser,
    version,
    os,
    mobile: /Mobile|Android|iPhone|iPad/.test(ua),
  }
}