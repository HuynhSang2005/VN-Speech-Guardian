/**
 * UI Component Types
 * Types specifically for React components và UI layer
 * These types are concerned with presentation và user interaction
 */

import type { Session, Detection, Transcript } from '../domain/models'

// =============================================================================
// Dashboard UI Types
// =============================================================================

export interface DashboardStats {
  totalSessions: number
  totalDetections: number
  accuracyRate: number
  averageProcessingTime: number
  trends: {
    sessions: number
    detections: number
    accuracy: number
    processingTime: number
  }
}

export interface RecentActivity {
  id: string
  type: 'detection' | 'session'
  severity: 'CLEAN' | 'OFFENSIVE' | 'HATE'
  content: string
  timestamp: string
  sessionId?: string
}

// =============================================================================
// Session List UI Types
// =============================================================================

export interface SessionTableRow {
  id: string
  userId: string
  userName: string
  startTime: string
  endTime: string | null
  duration: number // in seconds for display
  totalSegments: number
  detectionsCount: number
  highestSeverity: 'CLEAN' | 'OFFENSIVE' | 'HATE'
  status: 'completed' | 'processing' | 'failed'
  processingTime: number // in ms for display
}

export interface SessionsResponse {
  sessions: SessionTableRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// =============================================================================
// Session Detail UI Types
// =============================================================================

export interface SessionDetailView {
  session: Session
  transcripts: Transcript[]
  detections: Detection[]
  statistics: {
    totalWords: number
    averageConfidence: number
    detectionsCount: number
    duration: number
  }
}

export interface TranscriptSegmentView {
  id: string
  text: string
  startTime: number
  endTime: number
  confidence: number
  detections: DetectionHighlight[]
}

export interface DetectionHighlight {
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE'
  confidence: number
  snippet: string
  startMs: number
  endMs: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
}

// =============================================================================
// Live Processing UI Types
// =============================================================================

export interface LiveSessionState {
  sessionId: string | null
  status: 'idle' | 'recording' | 'processing' | 'error'
  audioStream: MediaStream | null
  transcript: string
  detections: LiveDetection[]
  errorMessage: string | null
}

export interface LiveDetection {
  id: string
  text: string
  confidence: number
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE'
}

// =============================================================================
// Audio Visualizer UI Types
// =============================================================================

export interface AudioVisualizerProps {
  isActive: boolean
  audioStream?: MediaStream
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'circular' | 'linear' | 'bars'
  color?: string
  backgroundColor?: string
  className?: string
}

export interface AudioVisualizerData {
  amplitude: number
  frequency: Float32Array
  volume: number
  isClipping: boolean
}

// =============================================================================
// Form Types
// =============================================================================

export interface SessionCreateFormData {
  userId: string
  device?: string
  language?: string
}

export interface SessionFilterFormData {
  dateRange?: {
    start: string
    end: string
  }
  status?: SessionTableRow['status'][]
  severity?: SessionTableRow['highestSeverity'][]
  search?: string
}

// =============================================================================
// Error Types cho UI
// =============================================================================

export interface UIError {
  message: string
  code?: string
  details?: string
  action?: {
    label: string
    handler: () => void
  }
}

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

// =============================================================================
// Pagination & Sorting
// =============================================================================

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterState {
  [key: string]: unknown
}

// =============================================================================
// Table Column Definitions
// =============================================================================

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: T[keyof T], row: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

// =============================================================================
// Chart Data Types
// =============================================================================

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface AnalyticsChartData {
  sessions: TimeSeriesDataPoint[]
  detections: TimeSeriesDataPoint[]
  accuracy: TimeSeriesDataPoint[]
}

// =============================================================================
// Modal & Dialog Types
// =============================================================================

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
}

export interface ConfirmDialogProps extends ModalProps {
  message: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}

// =============================================================================  
// Toast Notification Types
// =============================================================================

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

// All UI types are exported automatically