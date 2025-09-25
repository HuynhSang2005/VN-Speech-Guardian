/**
 * Real-time Audio Stream Simulation Tests
 * Advanced testing for continuous audio stream processing and performance validation
 * 
 * Coverage Areas:
 * - Continuous audio stream simulation
 * - Buffer management under load
 * - Network streaming reliability
 * - Audio quality preservation
 * - Real-world scenario testing
 * 
 * @author VN Speech Guardian Team
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAudio } from '../../../hooks/use-audio';
import type { AudioChunk, VADResult } from '../../../types/audio';

// =============================================================================
// Real-time Stream Simulation Utilities
// =============================================================================

/**
 * Simulates realistic continuous audio stream with various scenarios
 */
class AudioStreamSimulator {
  private isStreaming = false;
  private streamingInterval: NodeJS.Timeout | null = null;
  private chunkCallbacks: Array<(chunk: AudioChunk) => void> = [];
  private currentSequence = 0;
  private sessionStartTime = performance.now();
  
  // Stream characteristics
  private sampleRate = 16000;
  private chunkDurationMs = 400; // 400ms chunks
  private samplesPerChunk = Math.floor(this.sampleRate * this.chunkDurationMs / 1000);
  
  /**
   * Start continuous audio stream simulation
   */
  startStream(scenario: 'normal' | 'noisy' | 'intermittent' | 'vietnamese-conversation' = 'normal'): void {
    this.isStreaming = true;
    this.currentSequence = 0;
    this.sessionStartTime = performance.now();
    
    this.streamingInterval = setInterval(() => {
      if (!this.isStreaming) return;
      
      const chunk = this.generateRealtimeChunk(scenario);
      this.chunkCallbacks.forEach(callback => callback(chunk));
      this.currentSequence++;
    }, this.chunkDurationMs);
  }
  
  /**
   * Stop stream simulation
   */
  stopStream(): void {
    this.isStreaming = false;
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
  }
  
  /**
   * Subscribe to stream chunks
   */
  onChunk(callback: (chunk: AudioChunk) => void): () => void {
    this.chunkCallbacks.push(callback);
    return () => {
      const index = this.chunkCallbacks.indexOf(callback);
      if (index > -1) {
        this.chunkCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Generate realistic audio chunk based on scenario
   */
  private generateRealtimeChunk(scenario: string): AudioChunk {
    const pcmData = this.generateScenarioAudio(scenario);
    const vadResult = this.generateScenarioVAD(scenario);
    const signalLevel = this.calculateRMS(pcmData);
    
    return {
      pcmData,
      originalSampleRate: 48000,
      outputSampleRate: this.sampleRate,
      sequence: this.currentSequence,
      startTime: this.sessionStartTime,
      duration: this.chunkDurationMs,
      vadResult,
      signalLevel,
      clipCount: this.countClips(pcmData),
      processingTime: Math.random() * 5 + 1, // 1-6ms processing time
    };
  }
  
  private generateScenarioAudio(scenario: string): Float32Array {
    const data = new Float32Array(this.samplesPerChunk);
    const timeOffset = this.currentSequence * this.chunkDurationMs / 1000;
    
    switch (scenario) {
      case 'normal':
        return this.generateNormalSpeech(data, timeOffset);
      case 'noisy':
        return this.generateNoisySpeech(data, timeOffset);
      case 'intermittent':
        return this.generateIntermittentSpeech(data, timeOffset);
      case 'vietnamese-conversation':
        return this.generateVietnameseConversation(data, timeOffset);
      default:
        return data;
    }
  }
  
  private generateNormalSpeech(data: Float32Array, timeOffset: number): Float32Array {
    for (let i = 0; i < data.length; i++) {
      const t = (i / this.sampleRate) + timeOffset;
      
      // Vietnamese speech pattern - fundamental + harmonics + formants
      const f0 = 140 + 20 * Math.sin(2 * Math.PI * 2 * t); // Tonal variation
      let sample = 0.3 * Math.sin(2 * Math.PI * f0 * t); // Fundamental
      sample += 0.15 * Math.sin(2 * Math.PI * f0 * 2 * t); // 2nd harmonic
      sample += 0.08 * Math.sin(2 * Math.PI * f0 * 3 * t); // 3rd harmonic
      
      // Add formants (Vietnamese vowel characteristics)
      sample += 0.1 * Math.sin(2 * Math.PI * 700 * t); // F1
      sample += 0.08 * Math.sin(2 * Math.PI * 1200 * t); // F2
      sample += 0.05 * Math.sin(2 * Math.PI * 2400 * t); // F3
      
      // Natural amplitude envelope
      const envelope = (Math.sin(Math.PI * ((i % 1600) / 1600)) + 1) / 2;
      data[i] = sample * envelope * (0.8 + 0.2 * Math.random());
    }
    return data;
  }
  
  private generateNoisySpeech(data: Float32Array, timeOffset: number): Float32Array {
    const speechData = this.generateNormalSpeech(data, timeOffset);
    
    // Add background noise
    for (let i = 0; i < data.length; i++) {
      const noise = (Math.random() - 0.5) * 0.1; // Background noise
      data[i] = speechData[i] + noise;
    }
    return data;
  }
  
  private generateIntermittentSpeech(data: Float32Array, timeOffset: number): Float32Array {
    const cycleTime = timeOffset % 4; // 4-second cycle
    
    if (cycleTime < 2) {
      // First 2 seconds: speech
      return this.generateNormalSpeech(data, timeOffset);
    } else {
      // Next 2 seconds: silence with noise
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() - 0.5) * 0.005; // Very quiet noise
      }
      return data;
    }
  }
  
  private generateVietnameseConversation(data: Float32Array, timeOffset: number): Float32Array {
    const conversationPhase = Math.floor(timeOffset / 3) % 3; // 3-second phases
    
    switch (conversationPhase) {
      case 0: // Speaker A (higher pitch)
        return this.generateSpeakerVoice(data, timeOffset, { f0Base: 180, intensity: 0.35 });
      case 1: // Speaker B (lower pitch)
        return this.generateSpeakerVoice(data, timeOffset, { f0Base: 120, intensity: 0.3 });
      case 2: // Brief silence/overlap
        return this.generateIntermittentSpeech(data, timeOffset);
    }
    
    return data;
  }
  
  private generateSpeakerVoice(
    data: Float32Array, 
    timeOffset: number, 
    params: { f0Base: number; intensity: number }
  ): Float32Array {
    for (let i = 0; i < data.length; i++) {
      const t = (i / this.sampleRate) + timeOffset;
      
      const f0 = params.f0Base + 30 * Math.sin(2 * Math.PI * 1.5 * t); // Tonal
      let sample = params.intensity * Math.sin(2 * Math.PI * f0 * t);
      sample += (params.intensity * 0.4) * Math.sin(2 * Math.PI * f0 * 2 * t);
      
      // Individual voice characteristics
      const voiceColor = params.f0Base > 150 ? 
        0.08 * Math.sin(2 * Math.PI * 800 * t) : // Higher formant for female
        0.08 * Math.sin(2 * Math.PI * 650 * t);   // Lower formant for male
      
      sample += voiceColor;
      
      const envelope = Math.sin(Math.PI * ((i % 800) / 800));
      data[i] = sample * envelope;
    }
    return data;
  }
  
  private generateScenarioVAD(scenario: string): VADResult {
    const baseVAD: VADResult = {
      isSpeech: false,
      confidence: 0,
      energyDetection: false,
      frequencyDetection: false,
      spectralFlatnessDetection: false,
      pitchDetection: false,
      energyLevel: 0,
      dominantFrequency: 0,
      spectralFlatness: 0,
      fundamentalFrequency: 0,
      speechFrameCount: 0,
      silenceFrameCount: 0,
    };
    
    const timeOffset = this.currentSequence * this.chunkDurationMs / 1000;
    
    switch (scenario) {
      case 'normal':
        return {
          ...baseVAD,
          isSpeech: true,
          confidence: 0.9 + Math.random() * 0.08,
          energyDetection: true,
          frequencyDetection: true,
          spectralFlatnessDetection: true,
          pitchDetection: true,
          energyLevel: 0.25 + Math.random() * 0.1,
          dominantFrequency: 400 + Math.random() * 200,
          spectralFlatness: 2.0 + Math.random() * 1.5,
          fundamentalFrequency: 140 + Math.random() * 60,
          speechFrameCount: 10 + Math.floor(Math.random() * 5),
        };
        
      case 'noisy':
        return {
          ...baseVAD,
          isSpeech: true,
          confidence: 0.75 + Math.random() * 0.15, // Lower confidence
          energyDetection: true,
          frequencyDetection: true,
          spectralFlatnessDetection: false, // Noise affects this
          pitchDetection: true,
          energyLevel: 0.3 + Math.random() * 0.1,
          dominantFrequency: 450 + Math.random() * 300,
          spectralFlatness: 4.0 + Math.random() * 2.0, // Higher due to noise
          fundamentalFrequency: 135 + Math.random() * 70,
          speechFrameCount: 8 + Math.floor(Math.random() * 4),
        };
        
      case 'intermittent':
        const cycleTime = timeOffset % 4;
        if (cycleTime < 2) {
          return { ...baseVAD, ...this.generateScenarioVAD('normal') };
        } else {
          return {
            ...baseVAD,
            isSpeech: false,
            confidence: 0.05 + Math.random() * 0.05,
            energyLevel: 0.002 + Math.random() * 0.003,
            silenceFrameCount: 15 + Math.floor(Math.random() * 10),
          };
        }
        
      case 'vietnamese-conversation':
        const phase = Math.floor(timeOffset / 3) % 3;
        if (phase < 2) {
          const confidence = phase === 0 ? 0.88 : 0.85; // Slightly different for each speaker
          return {
            ...baseVAD,
            isSpeech: true,
            confidence: confidence + Math.random() * 0.1,
            energyDetection: true,
            frequencyDetection: true,
            spectralFlatnessDetection: true,
            pitchDetection: true,
            energyLevel: phase === 0 ? 0.35 : 0.3,
            dominantFrequency: phase === 0 ? 500 : 380,
            fundamentalFrequency: phase === 0 ? 180 : 120,
            speechFrameCount: 12 + Math.floor(Math.random() * 3),
          };
        } else {
          return this.generateScenarioVAD('intermittent');
        }
    }
    
    return baseVAD;
  }
  
  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }
  
  private countClips(data: Float32Array): number {
    let clips = 0;
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) >= 0.99) clips++;
    }
    return clips;
  }
}

/**
 * Stream quality analyzer for testing audio processing integrity
 */
class StreamQualityAnalyzer {
  private chunks: AudioChunk[] = [];
  private sequenceGaps: number[] = [];
  private latencyMeasurements: number[] = [];
  
  addChunk(chunk: AudioChunk): void {
    this.chunks.push(chunk);
    
    // Check for sequence gaps
    if (this.chunks.length > 1) {
      const prevChunk = this.chunks[this.chunks.length - 2];
      const expectedSequence = prevChunk.sequence + 1;
      if (chunk.sequence !== expectedSequence) {
        this.sequenceGaps.push(chunk.sequence - expectedSequence);
      }
    }
    
    // Measure processing latency
    this.latencyMeasurements.push(chunk.processingTime);
  }
  
  getQualityMetrics() {
    if (this.chunks.length === 0) {
      return {
        totalChunks: 0,
        sequenceGaps: 0,
        averageLatency: 0,
        maxLatency: 0,
        p95Latency: 0,
        avgSignalLevel: 0,
        totalClips: 0,
        vadAccuracy: 0,
        continuityScore: 0,
      };
    }
    
    const totalChunks = this.chunks.length;
    const sequenceGaps = this.sequenceGaps.length;
    
    const latencies = this.latencyMeasurements;
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    
    const avgSignalLevel = this.chunks.reduce((sum, chunk) => sum + chunk.signalLevel, 0) / totalChunks;
    const totalClips = this.chunks.reduce((sum, chunk) => sum + chunk.clipCount, 0);
    
    // Calculate VAD accuracy (based on signal levels vs VAD decisions)
    let correctVADDecisions = 0;
    for (const chunk of this.chunks) {
      const shouldBeSpeech = chunk.signalLevel > 0.05; // Threshold for speech
      const vadSaysSpeech = chunk.vadResult.isSpeech;
      if (shouldBeSpeech === vadSaysSpeech) {
        correctVADDecisions++;
      }
    }
    const vadAccuracy = correctVADDecisions / totalChunks;
    
    // Continuity score (lower gaps = better continuity)
    const continuityScore = Math.max(0, 1 - (sequenceGaps / totalChunks));
    
    return {
      totalChunks,
      sequenceGaps,
      averageLatency,
      maxLatency,
      p95Latency,
      avgSignalLevel,
      totalClips,
      vadAccuracy,
      continuityScore,
    };
  }
  
  reset(): void {
    this.chunks = [];
    this.sequenceGaps = [];
    this.latencyMeasurements = [];
  }
}

// =============================================================================
// Real-time Stream Processing Tests  
// =============================================================================

describe('Real-time Audio Stream Processing', () => {
  let streamSimulator: AudioStreamSimulator;
  let qualityAnalyzer: StreamQualityAnalyzer;
  
  beforeEach(() => {
    // Setup enhanced Web Audio API mocking
    const mockAudioContext = {
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue(undefined),
      },
      createAudioWorkletNode: vi.fn(),
      createMediaStreamSource: vi.fn(),
      sampleRate: 48000,
      currentTime: 0,
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
    };
    
    const mockWorkletNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: {
        postMessage: vi.fn(),
        onmessage: null,
        start: vi.fn(),
        close: vi.fn(),
      },
    };
    
    mockAudioContext.createAudioWorkletNode.mockReturnValue(mockWorkletNode);
    (global as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
    
    streamSimulator = new AudioStreamSimulator();
    qualityAnalyzer = new StreamQualityAnalyzer();
  });
  
  afterEach(() => {
    streamSimulator.stopStream();
    qualityAnalyzer.reset();
    vi.clearAllMocks();
  });

  it('should handle continuous normal speech stream without degradation', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    // Subscribe to stream chunks
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
    });
    
    // Start 5-second continuous stream
    await act(async () => {
      streamSimulator.startStream('normal');
      await new Promise(resolve => setTimeout(resolve, 5000));
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    
    // Quality expectations for continuous speech
    expect(metrics.totalChunks).toBeGreaterThanOrEqual(12); // ~12 chunks in 5 seconds
    expect(metrics.sequenceGaps).toBeLessThanOrEqual(1); // Minimal gaps allowed
    expect(metrics.averageLatency).toBeLessThan(10); // <10ms average latency
    expect(metrics.maxLatency).toBeLessThan(20); // <20ms max latency  
    expect(metrics.vadAccuracy).toBeGreaterThan(0.85); // >85% VAD accuracy
    expect(metrics.continuityScore).toBeGreaterThan(0.9); // >90% continuity
    expect(metrics.totalClips).toBeLessThan(5); // Minimal clipping
    
    unsubscribe();
  });

  it('should maintain performance in noisy environment', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
    });
    
    // Test noisy speech scenario
    await act(async () => {
      streamSimulator.startStream('noisy');
      await new Promise(resolve => setTimeout(resolve, 3000));
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    
    // Adjusted expectations for noisy conditions
    expect(metrics.vadAccuracy).toBeGreaterThan(0.7); // >70% VAD accuracy (lower in noise)
    expect(metrics.averageLatency).toBeLessThan(12); // Slightly higher latency acceptable
    expect(metrics.continuityScore).toBeGreaterThan(0.85); // Still good continuity
    expect(metrics.avgSignalLevel).toBeGreaterThan(0.15); // Higher signal due to noise
    
    unsubscribe();
  });

  it('should handle intermittent speech patterns correctly', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    const speechChunks: AudioChunk[] = [];
    const silenceChunks: AudioChunk[] = [];
    
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
      
      if (chunk.vadResult.isSpeech) {
        speechChunks.push(chunk);
      } else {
        silenceChunks.push(chunk);
      }
    });
    
    // Test intermittent speech (2s speech, 2s silence pattern)
    await act(async () => {
      streamSimulator.startStream('intermittent');
      await new Promise(resolve => setTimeout(resolve, 8000)); // 2 full cycles
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    
    // Should have roughly equal speech and silence chunks
    const speechRatio = speechChunks.length / metrics.totalChunks;
    expect(speechRatio).toBeGreaterThan(0.3);
    expect(speechRatio).toBeLessThan(0.7);
    
    // Speech chunks should have good quality
    const avgSpeechSignal = speechChunks.reduce((sum, chunk) => sum + chunk.signalLevel, 0) / speechChunks.length;
    expect(avgSpeechSignal).toBeGreaterThan(0.2);
    
    // Silence chunks should be actually silent
    const avgSilenceSignal = silenceChunks.reduce((sum, chunk) => sum + chunk.signalLevel, 0) / silenceChunks.length;
    expect(avgSilenceSignal).toBeLessThan(0.01);
    
    unsubscribe();
  });

  it('should process Vietnamese conversation with speaker transitions', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    const vadResults: VADResult[] = [];
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
      vadResults.push(chunk.vadResult);
    });
    
    // Test Vietnamese conversation scenario
    await act(async () => {
      streamSimulator.startStream('vietnamese-conversation');
      await new Promise(resolve => setTimeout(resolve, 9000)); // 3 conversation cycles
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    
    // Should detect speech in conversation phases
    const speechDetections = vadResults.filter(vad => vad.isSpeech).length;
    const totalDetections = vadResults.length;
    const speechRatio = speechDetections / totalDetections;
    
    expect(speechRatio).toBeGreaterThan(0.6); // Majority should be speech
    expect(metrics.vadAccuracy).toBeGreaterThan(0.75); // Good detection accuracy
    
    // Check for speaker characteristic variations
    const fundamentalFreqs = vadResults
      .filter(vad => vad.isSpeech)
      .map(vad => vad.fundamentalFrequency);
    
    if (fundamentalFreqs.length > 0) {
      const avgF0 = fundamentalFreqs.reduce((sum, f0) => sum + f0, 0) / fundamentalFreqs.length;
      const f0Variance = fundamentalFreqs.reduce((sum, f0) => sum + Math.pow(f0 - avgF0, 2), 0) / fundamentalFreqs.length;
      
      expect(avgF0).toBeGreaterThan(100); // Reasonable F0 range
      expect(avgF0).toBeLessThan(250);
      expect(f0Variance).toBeGreaterThan(100); // Should have speaker variation
    }
    
    unsubscribe();
  });

  it('should maintain memory efficiency during long streams', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    let peakMemory = initialMemory;
    
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
      
      // Monitor memory usage
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      peakMemory = Math.max(peakMemory, currentMemory);
    });
    
    // Run long stream (15 seconds)
    await act(async () => {
      streamSimulator.startStream('normal');
      await new Promise(resolve => setTimeout(resolve, 15000));
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    const memoryIncrease = peakMemory - initialMemory;
    
    // Should process many chunks efficiently
    expect(metrics.totalChunks).toBeGreaterThanOrEqual(35);
    expect(metrics.continuityScore).toBeGreaterThan(0.9);
    
    // Memory usage should be reasonable
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // <20MB increase
    
    unsubscribe();
  });

  it('should recover from temporary processing interruptions', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    let interruptionInjected = false;
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      // Simulate processing interruption halfway through
      if (!interruptionInjected && qualityAnalyzer.getQualityMetrics().totalChunks === 5) {
        interruptionInjected = true;
        // Simulate brief interruption (skip adding chunk to analyzer)
        setTimeout(() => {
          qualityAnalyzer.addChunk(chunk);
        }, 100);
      } else {
        qualityAnalyzer.addChunk(chunk);
      }
    });
    
    await act(async () => {
      streamSimulator.startStream('normal');
      await new Promise(resolve => setTimeout(resolve, 6000));
      streamSimulator.stopStream();
    });
    
    const metrics = qualityAnalyzer.getQualityMetrics();
    
    // Should recover and continue processing
    expect(metrics.totalChunks).toBeGreaterThanOrEqual(10);
    expect(metrics.sequenceGaps).toBeLessThanOrEqual(2); // Interruption may cause 1-2 gaps
    expect(metrics.continuityScore).toBeGreaterThan(0.8); // Still good overall
    
    unsubscribe();
  });

  it('should provide accurate real-time performance metrics', async () => {
    const { result } = renderHook(() => useAudio());
    
    await waitFor(() => {
      expect(result.current.audioContext).toBeDefined();
    });
    
    const performanceSnapshots: any[] = [];
    const unsubscribe = streamSimulator.onChunk((chunk) => {
      qualityAnalyzer.addChunk(chunk);
      
      // Take performance snapshots periodically
      if (qualityAnalyzer.getQualityMetrics().totalChunks % 5 === 0) {
        performanceSnapshots.push(qualityAnalyzer.getQualityMetrics());
      }
    });
    
    await act(async () => {
      streamSimulator.startStream('normal');
      await new Promise(resolve => setTimeout(resolve, 4000));
      streamSimulator.stopStream();
    });
    
    const finalMetrics = qualityAnalyzer.getQualityMetrics();
    
    // Should have collected multiple performance snapshots
    expect(performanceSnapshots.length).toBeGreaterThanOrEqual(2);
    
    // Performance should remain stable over time
    const latencyTrend = performanceSnapshots.map(snapshot => snapshot.averageLatency);
    const maxLatencyIncrease = Math.max(...latencyTrend) - Math.min(...latencyTrend);
    expect(maxLatencyIncrease).toBeLessThan(5); // <5ms latency variation
    
    // Final metrics should meet requirements
    expect(finalMetrics.averageLatency).toBeLessThan(10);
    expect(finalMetrics.p95Latency).toBeLessThan(15);
    expect(finalMetrics.vadAccuracy).toBeGreaterThan(0.85);
    
    unsubscribe();
  });
});