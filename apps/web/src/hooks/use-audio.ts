/**
 * Hook để xử lý audio stream và voice activity detection
 * Sử dụng modern React 19 patterns với AudioWorkletProcessor
 */
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { 
  TAudioProcessingConfig, 
  TAudioAnalysisResult,
  THookError 
} from '@/schemas';
import type { AsyncHookState, UseAudioReturn } from '@/types/hooks';

export function useAudio(config: Partial<TAudioProcessingConfig> = {}): UseAudioReturn {
  const [state, setState] = useState<AsyncHookState<MediaStream>>({
    data: null,
    loading: false,
    error: null
  });
  
  const [analysisResult, setAnalysisResult] = useState<TAudioAnalysisResult | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Default config với modern patterns
  const audioConfig = useMemo((): MediaStreamConstraints => ({
    audio: {
      sampleRate: config.sampleRate || 16000,
      channelCount: config.channelCount || 1,
      autoGainControl: config.autoGainControl ?? true,
      echoCancellation: config.echoCancellation ?? true,
      noiseSuppression: config.noiseSuppression ?? true
    }
  }), [config]);

  // Check browser support cho modern Web Audio API
  const isSupported = useMemo((): boolean => {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.AudioContext &&
      window.AudioWorkletNode
    );
  }, []);

  // Voice Activity Detection với modern algorithm
  const analyzeAudio = useCallback((dataArray: Uint8Array): TAudioAnalysisResult => {
    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i];
      if (value !== undefined) {
        const normalizedValue = (value - 128) / 128;
        sum += normalizedValue * normalizedValue;
      }
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const volume = Math.min(Math.max(rms * 100, 0), 100);

    // Simple frequency analysis
    const frequency: number[] = Array.from(dataArray).map(val => val / 255);
    
    // Voice detection heuristic - improved algorithm
    const voiceThreshold = 15; // Adjusted for better detection
    const voiceFreqRange = dataArray.slice(10, 50); // Human voice range ~300-3000Hz
    const voiceEnergy = voiceFreqRange.reduce((sum, val) => sum + val, 0) / voiceFreqRange.length;
    
    const isVoiceDetected = volume > voiceThreshold && voiceEnergy > 30;

    return {
      volume,
      frequency,
      isVoiceDetected
    };
  }, []);

  // Real-time audio analysis loop
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);
      const result = analyzeAudio(dataArray);
      
      setAnalysisResult(result);
      setAudioLevel(result.volume);

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [isRecording, analyzeAudio]);

  // Start recording với error handling
  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: { 
          message: 'Web Audio API not supported in this browser', 
          name: 'UnsupportedBrowserError',
          code: 'UNSUPPORTED_BROWSER',
          timestamp: new Date()
        }
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia(audioConfig);
      streamRef.current = stream;

      // Create AudioContext với proper sample rate
      const audioContext = new AudioContext({ 
        sampleRate: config.sampleRate || 16000,
        latencyHint: 'interactive' // Low latency for real-time
      });
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024; // Good balance of resolution/performance  
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Load AudioWorklet if available
      try {
        await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
        const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        source.connect(workletNode);
        workletNodeRef.current = workletNode;

        // Listen to worklet messages
        workletNode.port.onmessage = (event) => {
          const { type, data } = event.data;
          if (type === 'audio-data') {
            // Process advanced audio data từ worklet
            console.log('Advanced audio processing data:', data);
          }
        };
      } catch (workletError) {
        console.warn('AudioWorklet not available, using fallback:', workletError);
        // Fallback to basic analysis without worklet
      }

      setState({ data: stream, loading: false, error: null });
      setIsRecording(true);

      // Start analysis loop
      startAnalysis();

    } catch (error) {
      const audioError: THookError = {
        message: error instanceof Error ? error.message : 'Failed to start recording',
        name: 'AudioRecordingError',
        code: 'RECORDING_FAILED',
        timestamp: new Date()
      };

      setState({ data: null, loading: false, error: audioError });
    }
  }, [isSupported, audioConfig, config.sampleRate, startAnalysis]);

  // Stop recording và cleanup
  const stopRecording = useCallback((): void => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear refs
    analyserRef.current = null;
    workletNodeRef.current = null;

    // Reset state
    setState({ data: null, loading: false, error: null });
    setIsRecording(false);
    setAnalysisResult(null);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    stream: state.data,
    isRecording,
    isSupported,
    analysisResult,
    audioLevel,
    startRecording,
    stopRecording,
    error: state.error,
    loading: state.loading
  };
}

export default useAudio;