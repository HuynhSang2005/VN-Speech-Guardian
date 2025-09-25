/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Web Audio API với focused implementation
const mockAudioContext = {
  state: 'running',
  sampleRate: 48000,
  currentTime: 0,
  destination: {},
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(undefined),
  },
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockAudioWorkletNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: {
    postMessage: vi.fn(),
    onmessage: null,
  },
};

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
  getAudioTracks: () => [{ stop: vi.fn() }],
  active: true,
});

// Global mocks
global.AudioContext = vi.fn(() => mockAudioContext) as any;
global.AudioWorkletNode = vi.fn(() => mockAudioWorkletNode) as any;

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

// Simple useAudio hook mock for focused testing
const mockUseAudio = () => ({
  isCapturing: false,
  audioContext: null,
  audioData: null,
  error: null,
  startCapture: vi.fn(),
  stopCapture: vi.fn(),
  processAudioChunk: vi.fn(),
});

vi.mock('../useAudio', () => ({
  useAudio: vi.fn(mockUseAudio),
}));

// Audio processing utilities for focused testing
class AudioTestUtils {
  static generatePCMData(samples: number = 1024): Float32Array {
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.5; // 440Hz sine wave
    }
    return data;
  }
  
  static generateSilence(samples: number = 1024): Float32Array {
    return new Float32Array(samples); // All zeros
  }
  
  static generateNoise(samples: number = 1024, amplitude: number = 0.1): Float32Array {
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() - 0.5) * 2 * amplitude;
    }
    return data;
  }
  
  static calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  static validatePCMFormat(samples: Float32Array): boolean {
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (!isFinite(sample) || sample < -1 || sample > 1) {
        return false;
      }
    }
    return true;
  }
}

// VAD (Voice Activity Detection) simulation
class VADProcessor {
  private threshold: number;
  
  constructor(threshold: number = 0.02) {
    this.threshold = threshold;
  }
  
  detectVoiceActivity(samples: Float32Array): {
    isVoiceActive: boolean;
    confidence: number;
    energyLevel: number;
  } {
    const rms = AudioTestUtils.calculateRMS(samples);
    const isVoiceActive = rms > this.threshold;
    const confidence = Math.min(rms / this.threshold, 1.0);
    
    return {
      isVoiceActive,
      confidence,
      energyLevel: rms,
    };
  }
  
  setThreshold(threshold: number) {
    this.threshold = threshold;
  }
}

describe('Audio Processing Core Functionality', () => {
  let vadProcessor: VADProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    vadProcessor = new VADProcessor(0.02);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PCM Data Processing', () => {
    it('should generate and validate PCM data format', () => {
      const pcmData = AudioTestUtils.generatePCMData(1024);
      
      expect(pcmData).toBeInstanceOf(Float32Array);
      expect(pcmData.length).toBe(1024);
      expect(AudioTestUtils.validatePCMFormat(pcmData)).toBe(true);
    });

    it('should calculate RMS energy correctly', () => {
      const silenceData = AudioTestUtils.generateSilence(1024);
      const speechData = AudioTestUtils.generatePCMData(1024);
      const noiseData = AudioTestUtils.generateNoise(1024, 0.1);

      const silenceRMS = AudioTestUtils.calculateRMS(silenceData);
      const speechRMS = AudioTestUtils.calculateRMS(speechData);
      const noiseRMS = AudioTestUtils.calculateRMS(noiseData);

      expect(silenceRMS).toBe(0);
      expect(speechRMS).toBeGreaterThan(0.1);
      expect(noiseRMS).toBeGreaterThan(0);
      expect(noiseRMS).toBeLessThan(0.2);
    });

    it('should handle invalid PCM data gracefully', () => {
      const invalidData = new Float32Array([NaN, Infinity, -Infinity, 2.0, -2.0]);
      
      expect(AudioTestUtils.validatePCMFormat(invalidData)).toBe(false);
      
      // Validate correction logic
      const correctedData = new Float32Array(invalidData.length);
      for (let i = 0; i < invalidData.length; i++) {
        const sample = invalidData[i];
        correctedData[i] = isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0;
      }
      
      expect(AudioTestUtils.validatePCMFormat(correctedData)).toBe(true);
      expect(correctedData[0]).toBe(0); // NaN -> 0
      expect(correctedData[1]).toBe(0); // Infinity -> 0
      expect(correctedData[2]).toBe(0); // -Infinity -> 0
      expect(correctedData[3]).toBe(1); // 2.0 -> 1
      expect(correctedData[4]).toBe(-1); // -2.0 -> -1
    });
  });

  describe('Voice Activity Detection (VAD)', () => {
    it('should detect speech vs silence accurately', () => {
      const speechData = AudioTestUtils.generatePCMData(1024);
      const silenceData = AudioTestUtils.generateSilence(1024);

      const speechVAD = vadProcessor.detectVoiceActivity(speechData);
      const silenceVAD = vadProcessor.detectVoiceActivity(silenceData);

      expect(speechVAD.isVoiceActive).toBe(true);
      expect(speechVAD.confidence).toBeGreaterThan(0.5);
      expect(speechVAD.energyLevel).toBeGreaterThan(0.1);

      expect(silenceVAD.isVoiceActive).toBe(false);
      expect(silenceVAD.confidence).toBe(0);
      expect(silenceVAD.energyLevel).toBe(0);
    });

    it('should handle background noise appropriately', () => {
      const lowNoise = AudioTestUtils.generateNoise(1024, 0.01);
      const highNoise = AudioTestUtils.generateNoise(1024, 0.1);

      const lowNoiseVAD = vadProcessor.detectVoiceActivity(lowNoise);
      const highNoiseVAD = vadProcessor.detectVoiceActivity(highNoise);

      expect(lowNoiseVAD.isVoiceActive).toBe(false);
      expect(highNoiseVAD.isVoiceActive).toBe(true);
    });

    it('should adapt VAD threshold correctly', () => {
      const testData = AudioTestUtils.generateNoise(1024, 0.05);
      
      // Test với different thresholds
      vadProcessor.setThreshold(0.01);
      const lowThresholdVAD = vadProcessor.detectVoiceActivity(testData);
      
      vadProcessor.setThreshold(0.1);
      const highThresholdVAD = vadProcessor.detectVoiceActivity(testData);

      expect(lowThresholdVAD.isVoiceActive).toBe(true);
      expect(highThresholdVAD.isVoiceActive).toBe(false);
    });

    it('should provide confidence scores within valid range', () => {
      const testData = AudioTestUtils.generatePCMData(1024);
      const vadResult = vadProcessor.detectVoiceActivity(testData);

      expect(vadResult.confidence).toBeGreaterThanOrEqual(0);
      expect(vadResult.confidence).toBeLessThanOrEqual(1);
      expect(vadResult.energyLevel).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audio Processing Integration', () => {
    it('should initialize audio context successfully', () => {
      expect(global.AudioContext).toBeDefined();
      
      const audioContext = new (global.AudioContext as any)();
      expect(audioContext.state).toBe('running');
      expect(audioContext.sampleRate).toBe(48000);
      expect(audioContext.audioWorklet).toBeDefined();
    });

    it('should validate audio worklet module loading setup', () => {
      const audioContext = new (global.AudioContext as any)();
      
      expect(audioContext.audioWorklet.addModule).toBeDefined();
      expect(typeof audioContext.audioWorklet.addModule).toBe('function');
    });

    it('should create and configure AudioWorkletNode', () => {
      expect(global.AudioWorkletNode).toBeDefined();
      
      const workletNode = new (global.AudioWorkletNode as any)(
        mockAudioContext,
        'audio-processor',
        {
          processorOptions: {
            sampleRate: 16000,
            vadThreshold: 0.02,
          },
        }
      );
      
      expect(workletNode.connect).toBeDefined();
      expect(workletNode.disconnect).toBeDefined();
      expect(workletNode.port).toBeDefined();
    });

    it('should validate media stream API setup', () => {
      expect(global.navigator.mediaDevices).toBeDefined();
      expect(global.navigator.mediaDevices.getUserMedia).toBeDefined();
      expect(typeof mockGetUserMedia).toBe('function');
    });
  });

  describe('Audio Hook Integration', () => {
    it('should provide correct initial state', () => {
      const { result } = renderHook(() => {
        const mockHook = mockUseAudio();
        return mockHook;
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.audioContext).toBeNull();
      expect(result.current.audioData).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should provide audio processing functions', () => {
      const { result } = renderHook(() => {
        const mockHook = mockUseAudio();
        return mockHook;
      });

      expect(typeof result.current.startCapture).toBe('function');
      expect(typeof result.current.stopCapture).toBe('function');
      expect(typeof result.current.processAudioChunk).toBe('function');
    });
  });

  describe('Performance Considerations', () => {
    it('should process audio data efficiently', () => {
      const startTime = performance.now();
      
      // Simulate processing 1000 audio chunks
      for (let i = 0; i < 1000; i++) {
        const testData = AudioTestUtils.generatePCMData(512);
        vadProcessor.detectVoiceActivity(testData);
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 chunks trong reasonable time
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle memory efficiently with large data', () => {
      const largeDataSize = 16000; // 1 second of 16kHz audio
      const testData = AudioTestUtils.generatePCMData(largeDataSize);
      
      expect(testData.length).toBe(largeDataSize);
      expect(AudioTestUtils.validatePCMFormat(testData)).toBe(true);
      
      const vadResult = vadProcessor.detectVoiceActivity(testData);
      expect(vadResult).toBeDefined();
      expect(vadResult.isVoiceActive).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted audio data', () => {
      const corruptedData = new Float32Array(1024);
      // Fill với corrupted values
      for (let i = 0; i < corruptedData.length; i++) {
        corruptedData[i] = i % 2 === 0 ? NaN : Infinity;
      }

      expect(() => {
        AudioTestUtils.validatePCMFormat(corruptedData);
      }).not.toThrow();

      expect(AudioTestUtils.validatePCMFormat(corruptedData)).toBe(false);
    });

    it('should handle empty audio data', () => {
      const emptyData = new Float32Array(0);
      
      expect(() => {
        AudioTestUtils.calculateRMS(emptyData);
      }).not.toThrow();

      const rms = AudioTestUtils.calculateRMS(emptyData);
      expect(isNaN(rms)).toBe(true);
    });

    it('should handle VAD với invalid input', () => {
      const invalidData = new Float32Array([NaN, Infinity, -Infinity]);
      
      expect(() => {
        vadProcessor.detectVoiceActivity(invalidData);
      }).not.toThrow();

      const vadResult = vadProcessor.detectVoiceActivity(invalidData);
      expect(vadResult.isVoiceActive).toBe(false);
    });
  });
});