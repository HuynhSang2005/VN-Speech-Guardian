/**
 * Live Processing page - Real-time speech processing interface
 * - Audio recording và streaming
 * - Real-time transcript display
 * - Detection alerts và warnings
 * - Immersive dark theme UI
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { 
  Mic, 
  Play, 
  Pause, 
  Square,
  Settings,
  AlertTriangle,
  Shield,
  CheckCircle,
  Zap
} from 'lucide-react'
import type { TranscriptSegment, Detection, LiveSession } from '@/types/components'

// Mock data và state management
const initialSession: LiveSession = {
  id: '',
  status: 'idle',
  duration: 0,
  totalSegments: 0,
  detectionsCount: 0
}

// Component cho audio visualizer (placeholder)
function AudioVisualizer({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="relative w-80 h-80 mx-auto">
      {/* Circular visualizer background */}
      <div className="absolute inset-0 rounded-full border-4 border-gray-700/30"></div>
      
      {/* Central mic icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`p-8 rounded-full transition-all duration-300 ${
          isRecording 
            ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' 
            : 'bg-gray-700 hover:bg-gray-600'
        }`}>
          <Mic className="w-12 h-12 text-white" />
        </div>
      </div>
      
      {/* Animated rings khi recording */}
      {isRecording && (
        <>
          <div className="absolute inset-4 rounded-full border-2 border-red-400/60 animate-ping"></div>
          <div className="absolute inset-8 rounded-full border border-red-300/40 animate-ping delay-100"></div>
        </>
      )}
      
      {/* Audio level bars (placeholder) */}
      <div className="absolute inset-16 flex items-center justify-center">
        <div className="flex space-x-1">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className={`w-1 bg-green-400 rounded-full transition-all duration-150 ${
                isRecording 
                  ? `h-${Math.floor(Math.random() * 12) + 4} animate-pulse` 
                  : 'h-2'
              }`}
              style={{
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Component cho transcript segment
function TranscriptSegment({ segment }: { segment: TranscriptSegment }) {
  const hasDetection = segment.detections.length > 0
  const highestSeverity = hasDetection 
    ? segment.detections.reduce((max, det) => 
        det.type === 'HATE' ? det : (det.type === 'OFFENSIVE' && max.type !== 'HATE') ? det : max
      )
    : null

  const severityConfig = {
    CLEAN: { color: 'border-green-500 bg-green-50', icon: CheckCircle, iconColor: 'text-green-600' },
    OFFENSIVE: { color: 'border-yellow-500 bg-yellow-50', icon: AlertTriangle, iconColor: 'text-yellow-600' },
    HATE: { color: 'border-red-500 bg-red-50', icon: Shield, iconColor: 'text-red-600' }
  }

  const config = highestSeverity ? severityConfig[highestSeverity.type] : severityConfig.CLEAN
  const Icon = config.icon

  return (
    <div className={`p-4 rounded-lg border-l-4 ${config.color} mb-3`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm text-gray-600">
              {new Date(segment.startTime).toLocaleTimeString()}
            </span>
            <span className="text-xs text-gray-500">
              Confidence: {(segment.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-gray-900 font-medium">
            {segment.text}
          </p>
          {hasDetection && (
            <div className="mt-2 space-y-1">
              {segment.detections.map((detection, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    detection.type === 'HATE' ? 'bg-red-100 text-red-800' :
                    detection.type === 'OFFENSIVE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {detection.type}
                  </span>
                  <span className="text-gray-600">
                    {(detection.confidence * 100).toFixed(1)}% - "{detection.snippet}"
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main live processing component
function LiveProcessingPage() {
  const [session, setSession] = useState<LiveSession>(initialSession)
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([])
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Mock transcript data for demo
  const mockSegments: TranscriptSegment[] = [
    {
      id: '1',
      text: 'Xin chào, tôi đang test hệ thống Speech Guardian.',
      startTime: Date.now() - 30000,
      endTime: Date.now() - 25000,
      confidence: 0.95,
      detections: []
    },
    {
      id: '2', 
      text: 'Đây là một câu có thể gây tranh cãi.',
      startTime: Date.now() - 20000,
      endTime: Date.now() - 15000,
      confidence: 0.88,
      detections: [{
        type: 'OFFENSIVE',
        confidence: 0.72,
        snippet: 'gây tranh cãi',
        startMs: 5000,
        endMs: 8000
      }]
    }
  ]

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcriptSegments])

  // Session controls
  const startRecording = () => {
    const newSessionId = `session-${Date.now()}`
    setSession({
      ...session,
      id: newSessionId,
      status: 'recording',
      startTime: new Date()
    })
    setTranscriptSegments(mockSegments) // Demo data
    setIsWebSocketConnected(true)
  }

  const pauseRecording = () => {
    setSession({ ...session, status: 'paused' })
  }

  const resumeRecording = () => {
    setSession({ ...session, status: 'recording' })
  }

  const stopRecording = () => {
    setSession({ ...session, status: 'idle' })
    setIsWebSocketConnected(false)
  }

  const clearSession = () => {
    setSession(initialSession)
    setTranscriptSegments([])
    setIsWebSocketConnected(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Processing</h1>
            <p className="text-gray-400">Real-time speech analysis và detection</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`}></div>
              <span className="text-sm text-gray-400">
                {isWebSocketConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Settings button */}
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Controls và Visualizer */}
        <div className="w-1/2 p-6 flex flex-col items-center justify-center bg-gray-900">
          {/* Audio Visualizer */}
          <AudioVisualizer isRecording={session.status === 'recording'} />
          
          {/* Session Info */}
          <div className="mt-8 text-center">
            {session.status !== 'idle' && (
              <div className="mb-4 space-y-2">
                <p className="text-lg font-semibold">
                  Session: {session.id}
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
                  <span>Duration: {Math.floor(session.duration / 60)}:{String(session.duration % 60).padStart(2, '0')}</span>
                  <span>Segments: {transcriptSegments.length}</span>
                  <span>Detections: {transcriptSegments.reduce((acc, seg) => acc + seg.detections.length, 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-4">
            {session.status === 'idle' && (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                <Mic className="w-5 h-5" />
                <span>Bắt đầu ghi âm</span>
              </button>
            )}

            {session.status === 'recording' && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  <span>Tạm dừng</span>
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                >
                  <Square className="w-5 h-5" />
                  <span>Dừng</span>
                </button>
              </>
            )}

            {session.status === 'paused' && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                >
                  <Play className="w-5 h-5" />
                  <span>Tiếp tục</span>
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                >
                  <Square className="w-5 h-5" />
                  <span>Dừng</span>
                </button>
              </>
            )}

            {session.status !== 'idle' && (
              <button
                onClick={clearSession}
                className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Transcript */}
        <div className="w-1/2 bg-gray-50 border-l border-gray-700">
          <div className="h-full flex flex-col">
            {/* Transcript Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Real-time Transcript</h2>
              <p className="text-sm text-gray-600">Kết quả nhận dạng giọng nói và phát hiện nội dung</p>
            </div>

            {/* Transcript Content */}
            <div 
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-6 space-y-3"
            >
              {transcriptSegments.length > 0 ? (
                transcriptSegments.map((segment) => (
                  <TranscriptSegment key={segment.id} segment={segment} />
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Chưa có transcript</p>
                    <p className="text-sm">Bắt đầu ghi âm để xem kết quả real-time</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/live')({
  component: LiveProcessingPage,
})