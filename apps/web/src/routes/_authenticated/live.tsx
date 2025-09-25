import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AudioVisualizer, RecordingControls, TranscriptPanel } from '@/components/ui/enhanced-audio'
import { EnhancedButton } from '@/components/ui/enhanced-button'

function LiveProcessingPage() {
  const [sessionState, setSessionState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [transcript, setTranscript] = useState('')
  const [detections, setDetections] = useState<Array<{
    id: string
    text: string
    confidence: number
    severity: 'low' | 'medium' | 'high'
    timestamp: Date
  }>>([])

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      })
      
      setAudioStream(stream)
      setSessionState('recording')
      toast.success('Recording started')
    } catch (error) {
      toast.error('Failed to access microphone')
      console.error('Microphone access failed:', error)
    }
  }, [])

  const handleStopRecording = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
      setAudioStream(null)
    }
    setSessionState('idle')
    toast.info('Recording stopped')
  }, [audioStream])

  const handleClearTranscript = useCallback(() => {
    setTranscript('')
    setDetections([])
    toast.info('Transcript cleared')
  }, [])

  // Simulate real-time transcript updates (replace with actual WebSocket)
  useEffect(() => {
    if (sessionState !== 'recording') return

    const interval = setInterval(() => {
      const sampleTexts = [
        'Hello, this is a test message.',
        'Speech recognition is working properly.',
        'Real-time processing is active.',
        'Audio quality is good.',
        'System is monitoring for harmful content.',
      ]
      
      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
      setTranscript(prev => prev + ' ' + randomText)
    }, 3000)

    return () => clearInterval(interval)
  }, [sessionState])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white"
    >
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Live Processing</h1>
          <p className="text-gray-400">Real-time speech analysis and detection</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[80vh]">
          {/* Audio Visualizer - Center */}
          <div className="xl:col-span-2 flex flex-col items-center justify-center">
            <AudioVisualizer
              isActive={sessionState === 'recording'}
              audioStream={audioStream ?? undefined}
              size="xl"
              variant="circular"
              color="#10B981"
              backgroundColor="transparent"
              className="mb-8"
            />
            
            <RecordingControls
              isRecording={sessionState === 'recording'}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              disabled={sessionState === 'processing'}
              className="space-x-4"
            />
            
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-400 mb-2">
                Status: <span className="capitalize text-green-400">{sessionState}</span>
              </div>
              {sessionState === 'recording' && (
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Live Recording</span>
                </div>
              )}
            </div>
          </div>

          {/* Transcript Panel - Right */}
          <div className="xl:col-span-1">
            <TranscriptPanel
              transcripts={transcript ? [{
                id: 'live-transcript',
                text: transcript,
                timestamp: Date.now(),
                isFinal: true,
                detections: detections.map(d => ({
                  type: d.severity === 'high' ? 'block' : 'warning' as 'warning' | 'block',
                  severity: d.confidence,
                  snippet: d.text,
                  startOffset: 0,
                  endOffset: d.text.length,
                }))
              }] : []}
              isStreaming={sessionState === 'recording'}
              onClearTranscript={handleClearTranscript}
              className="h-full"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <EnhancedButton
            variant="outline"
            onClick={handleClearTranscript}
            disabled={!transcript}
          >
            Clear Transcript
          </EnhancedButton>
          <EnhancedButton
            variant="secondary"
            onClick={() => toast.info('Settings panel coming soon')}
          >
            Audio Settings
          </EnhancedButton>
        </div>
      </div>
    </motion.div>
  )
}

export const Route = createFileRoute('/_authenticated/live')({
  component: LiveProcessingPage,
})
