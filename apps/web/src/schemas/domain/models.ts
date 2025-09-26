/**
 * Domain Models - Business Logic Types
 * Core domain types cho VN Speech Guardian business logic
 * These types represent the core business concepts và should be stable
 */

// User domain
export interface User {
  id: string
  clerkId: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

// Session domain - complete business model
export interface Session {
  id: string
  userId: string
  device?: string
  language: string
  startedAt: string
  endedAt: string | null
  status: 'active' | 'completed' | 'failed'
  metadata?: {
    userAgent?: string
    location?: string
    [key: string]: unknown
  }
}

// Transcript domain
export interface Transcript {
  id: string
  sessionId: string
  segmentIndex: number
  text: string
  startTimeMs: number
  endTimeMs: number
  confidence?: number
  createdAt: string
}

// Detection domain
export interface Detection {
  id: string
  sessionId: string
  transcriptId: string | null
  label: 'CLEAN' | 'OFFENSIVE' | 'HATE'
  confidence: number
  startTimeMs: number
  endTimeMs: number
  snippet: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
}

// Statistics domain
export interface SessionStatistics {
  totalSessions: number
  totalDetections: number
  toxicPercentage: number
  averageSessionDuration: number
  topDetectionTypes: Array<{
    label: Detection['label']
    count: number
    percentage: number
  }>
}

// Audio processing domain
export interface AudioSegment {
  id: string
  sessionId: string
  startTimeMs: number
  endTimeMs: number
  audioBuffer?: ArrayBuffer
  sampleRate: number
  channels: number
}

// Real-time events domain
export interface RealtimeEvent {
  id: string
  type: 'transcript' | 'detection' | 'session_start' | 'session_end' | 'error'
  sessionId: string
  timestamp: string
  data: unknown
}

// All types are already exported above with export interface