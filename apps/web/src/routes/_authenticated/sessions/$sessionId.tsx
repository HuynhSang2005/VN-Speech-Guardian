/**
 * Session detail page - Chi tiết phiên xử lý với modal overlay
 * - Timeline của toàn bộ quá trình xử lý
 * - Audio segments với detections
 * - Transcript đầy đủ với highlights
 * - Export capabilities
 */

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  X,
  Download,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  Volume2,
  FileText,
  BarChart3
} from 'lucide-react'
import type { SessionDetail, SessionTranscriptSegment, SessionDetection } from '@/types/components'

// Mock data function
const fetchSessionDetail = async (sessionId: string): Promise<SessionDetail> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    id: sessionId,
    userId: 'user-123',
    userName: 'Nguyễn Văn A',
    userEmail: 'nguyen.van.a@example.com',
    startTime: '2025-09-22T10:30:00Z',
    endTime: '2025-09-22T10:45:00Z',
    duration: 900,
    status: 'completed',
    metadata: {
      clientVersion: '1.0.0',
      browserInfo: 'Chrome 118.0.0.0',
      audioConfig: {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16
      }
    },
    transcript: {
      fullText: 'Xin chào mọi người. Hôm nay chúng ta sẽ thảo luận về dự án mới. Tôi nghĩ rằng ý tưởng này thật tuyệt vời. Nhưng có một vài vấn đề cần giải quyết.',
      segments: [
        {
          id: 'seg-1',
          startTime: 0,
          endTime: 3000,
          text: 'Xin chào mọi người.',
          confidence: 0.95
        },
        {
          id: 'seg-2', 
          startTime: 3000,
          endTime: 8000,
          text: 'Hôm nay chúng ta sẽ thảo luận về dự án mới.',
          confidence: 0.88
        },
        {
          id: 'seg-3',
          startTime: 8000,
          endTime: 12000,
          text: 'Tôi nghĩ rằng ý tưởng này thật tuyệt vời.',
          confidence: 0.92
        },
        {
          id: 'seg-4',
          startTime: 12000,
          endTime: 16000,
          text: 'Nhưng có một vài vấn đề cần giải quyết.',
          confidence: 0.89
        }
      ]
    },
    detections: [
      {
        id: 'det-1',
        startTime: 12000,
        endTime: 16000,
        transcriptText: 'có một vài vấn đề',
        category: 'OFFENSIVE',
        severity: 0.3,
        confidence: 0.75,
        details: {
          keywords: ['vấn đề'],
          context: 'Negative language detected',
          reason: 'Potentially concerning language pattern'
        }
      }
    ],
    analytics: {
      totalWords: 24,
      averageConfidence: 0.91,
      processingLatency: 150,
      audioQualityScore: 0.88
    }
  }
}

// Component cho detection card
function DetectionCard({ detection }: { detection: SessionDetection }) {
  const severityColor = detection.severity > 0.7 
    ? 'bg-red-100 text-red-800 border-red-200'
    : detection.severity > 0.4
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : 'bg-orange-100 text-orange-800 border-orange-200'

  const categoryIcon = {
    OFFENSIVE: AlertTriangle,
    HATE: Shield,
    TOXIC: AlertTriangle
  }

  const Icon = categoryIcon[detection.category]

  return (
    <div className={`border rounded-lg p-4 ${severityColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4" />
          <span className="font-medium text-sm">{detection.category}</span>
        </div>
        <div className="text-xs">
          {Math.floor(detection.startTime / 1000)}s - {Math.floor(detection.endTime / 1000)}s
        </div>
      </div>
      
      <p className="text-sm mb-2 font-medium">"{detection.transcriptText}"</p>
      
      <div className="space-y-1 text-xs">
        <div>Severity: {Math.round(detection.severity * 100)}%</div>
        <div>Confidence: {Math.round(detection.confidence * 100)}%</div>
        <div>Keywords: {detection.details.keywords.join(', ')}</div>
        <div>Reason: {detection.details.reason}</div>
      </div>
    </div>
  )
}

// Component cho transcript segment
function TranscriptSegmentItem({ segment, hasDetection }: { segment: SessionTranscriptSegment; hasDetection: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${hasDetection ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">
          {Math.floor(segment.startTime / 1000)}s - {Math.floor(segment.endTime / 1000)}s
        </span>
        <span className="text-xs text-gray-500">
          Confidence: {Math.round(segment.confidence * 100)}%
        </span>
      </div>
      <p className="text-sm text-gray-900">{segment.text}</p>
    </div>
  )
}

// Loading component
function SessionDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  )
}

// Main session detail modal component
function SessionDetailModal() {
  const router = useRouter()
  const { sessionId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'detections' | 'analytics'>('overview')

  // Fetch session detail
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSessionDetail(sessionId),
  })

  const handleClose = () => {
    router.navigate({ to: '/sessions' })
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-red-600">Lỗi</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            Không thể tải chi tiết session. Vui lòng thử lại sau.
          </p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Session Detail</h1>
            <p className="text-sm text-gray-500">ID: {sessionId}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
              { id: 'transcript', label: 'Transcript', icon: FileText },
              { id: 'detections', label: 'Detections', icon: Shield },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="p-6">
              <SessionDetailLoading />
            </div>
          ) : session ? (
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">User</span>
                      </div>
                      <p className="text-sm text-gray-900">{session.userName}</p>
                      <p className="text-xs text-gray-500">{session.userEmail}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Duration</span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {Math.floor(session.duration / 60)}:{String(session.duration % 60).padStart(2, '0')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.startTime).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Detections</span>
                      </div>
                      <p className="text-sm text-gray-900">{session.detections.length} found</p>
                      <p className="text-xs text-gray-500">
                        Status: {session.status === 'completed' ? 'Hoàn thành' : session.status}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{session.analytics.totalWords}</div>
                      <div className="text-sm text-blue-600">Total Words</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(session.analytics.averageConfidence * 100)}%
                      </div>
                      <div className="text-sm text-green-600">Avg Confidence</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{session.analytics.processingLatency}ms</div>
                      <div className="text-sm text-purple-600">Processing Time</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(session.analytics.audioQualityScore * 100)}%
                      </div>
                      <div className="text-sm text-orange-600">Audio Quality</div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Technical Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Client Version:</span>
                        <span className="ml-2 text-gray-900">{session.metadata.clientVersion}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Browser:</span>
                        <span className="ml-2 text-gray-900">{session.metadata.browserInfo}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sample Rate:</span>
                        <span className="ml-2 text-gray-900">{session.metadata.audioConfig.sampleRate} Hz</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Channels:</span>
                        <span className="ml-2 text-gray-900">{session.metadata.audioConfig.channels}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Full Transcript</h3>
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {session.transcript.segments.length} segments
                      </span>
                    </div>
                  </div>

                  {/* Full text */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {session.transcript.fullText}
                    </p>
                  </div>

                  {/* Segments */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Segments</h4>
                    {session.transcript.segments.map((segment) => {
                      const hasDetection = session.detections.some(
                        detection => detection.startTime <= segment.endTime && detection.endTime >= segment.startTime
                      )
                      return (
                        <TranscriptSegmentItem
                          key={segment.id}
                          segment={segment}
                          hasDetection={hasDetection}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'detections' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Content Detections</h3>
                    <span className="text-sm text-gray-500">
                      {session.detections.length} detection{session.detections.length !== 1 ? 's' : ''} found
                    </span>
                  </div>

                  {session.detections.length > 0 ? (
                    <div className="space-y-4">
                      {session.detections.map((detection) => (
                        <DetectionCard key={detection.id} detection={detection} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                      <p className="text-lg font-medium text-gray-900">No detections found</p>
                      <p className="text-sm text-gray-500">
                        This session contains no harmful content
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="font-medium text-gray-900">Processing Analytics</h3>
                  
                  {/* Charts placeholder */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Confidence Over Time</h4>
                      <div className="h-32 bg-white rounded border flex items-center justify-center">
                        <span className="text-gray-500">Chart placeholder</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Detection Timeline</h4>
                      <div className="h-32 bg-white rounded border flex items-center justify-center">
                        <span className="text-gray-500">Timeline placeholder</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed metrics */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Detailed Metrics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Processing Time:</span>
                        <span className="text-gray-900">{session.analytics.processingLatency}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Average Segment Length:</span>
                        <span className="text-gray-900">
                          {Math.round(session.duration / session.transcript.segments.length * 1000)}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Audio Quality Score:</span>
                        <span className="text-gray-900">{Math.round(session.analytics.audioQualityScore * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Words per Minute:</span>
                        <span className="text-gray-900">
                          {Math.round(session.analytics.totalWords / (session.duration / 60))} WPM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/sessions/$sessionId')({
  component: SessionDetailModal,
})