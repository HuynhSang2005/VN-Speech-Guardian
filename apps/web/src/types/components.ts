/**
 * Component-related TypeScript interfaces
 * For compile-time type checking of component props and state
 * Separate from runtime validation schemas (src/schemas/)
 */

// =============================================================================
// Dashboard Page Types
// =============================================================================

export interface DashboardStats {
  totalSessions: number;
  totalDetections: number;
  accuracyRate: number;
  averageProcessingTime: number;
  trends: {
    sessions: number;
    detections: number;
    accuracy: number;
    processingTime: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'detection' | 'session';
  severity: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  content: string;
  timestamp: string;
  sessionId?: string;
}

// =============================================================================
// Live Processing Page Types
// =============================================================================

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  detections: Detection[];
}

export interface Detection {
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  confidence: number;
  snippet: string;
  startMs: number;
  endMs: number;
}

export interface LiveSession {
  id: string;
  status: 'idle' | 'recording' | 'processing' | 'paused';
  startTime?: Date;
  duration: number;
  totalSegments: number;
  detectionsCount: number;
}

// =============================================================================
// Sessions List Page Types
// =============================================================================

export interface Session {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  totalSegments: number;
  detectionsCount: number;
  highestSeverity: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  status: 'completed' | 'processing' | 'failed';
  processingTime: number; // in ms
}

export interface SessionsResponse {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Session Detail Page Types
// =============================================================================

export interface SessionDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  metadata: {
    clientVersion: string;
    browserInfo: string;
    audioConfig: {
      sampleRate: number;
      channels: number;
      bitDepth: number;
    };
  };
  transcript: {
    fullText: string;
    segments: SessionTranscriptSegment[];
  };
  detections: SessionDetection[];
  analytics: {
    totalWords: number;
    averageConfidence: number;
    processingLatency: number;
    audioQualityScore: number;
  };
}

export interface SessionTranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  speaker?: string;
}

export interface SessionDetection {
  id: string;
  startTime: number;
  endTime: number;
  transcriptText: string;
  category: 'OFFENSIVE' | 'HATE' | 'TOXIC';
  severity: number; // 0-1
  confidence: number; // 0-1
  details: {
    keywords: string[];
    context: string;
    reason: string;
  };
}

// =============================================================================
// Common UI Component Types
// =============================================================================

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export interface ActivityItemProps {
  activity: RecentActivity;
}

export interface TranscriptSegmentProps {
  segment: TranscriptSegment;
}

export interface DetectionCardProps {
  detection: SessionDetection;
}

export interface AudioVisualizerProps {
  isRecording: boolean;
}

// =============================================================================
// Export all types for centralized access
// =============================================================================

// Re-export commonly used types for convenience
export type SeverityLevel = 'CLEAN' | 'OFFENSIVE' | 'HATE';
export type SessionStatus = 'completed' | 'processing' | 'failed';
export type LiveSessionStatus = 'idle' | 'recording' | 'processing' | 'paused';
export type ActivityType = 'detection' | 'session';