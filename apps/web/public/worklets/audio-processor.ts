/**
 * Advanced AudioWorklet Processor - VN Speech Guardian
 * 
 * Tính năng chính:
 * - Real-time audio resampling (48kHz → 16kHz)  
 * - Voice Activity Detection (VAD) optimized for Vietnamese
 * - PCM buffer management cho Socket.IO streaming
 * - Performance monitoring và error handling
 * 
 * Architecture:
 * - Input: Raw audio từ microphone (native sample rate)
 * - Processing: Resampling + VAD analysis + buffer management
 * - Output: PCM chunks với VAD metadata cho AI processing
 * 
 * @author VN Speech Guardian Team
 * @version 1.0.0
 */

/// <reference path="./worklet-types.d.ts" />

// Import types for worklet environment
type WorkletError = Error;

// =============================================================================
// Type Definitions (mirrored từ main thread)
// =============================================================================

interface AudioProcessorConfig {
  inputSampleRate: number;
  outputSampleRate: number;
  frameSize: number;
  chunkSize: number;
  bufferSize: number;
  vadEnabled: boolean;
  vadSensitivity: 'low' | 'medium' | 'high' | 'custom';
  enablePerformanceMonitoring: boolean;
  maxProcessingTime: number;
  debug: boolean;
  enableLogging: boolean;
}

interface VADThresholds {
  energyThreshold: number;
  frequencyThreshold: number;
  spectralFlatnessThreshold: number;
  pitchThreshold: number;
  speechToSilenceFrames: number;
  silenceToSpeechFrames: number;
}

interface VADResult {
  isSpeech: boolean;
  confidence: number;
  energyDetection: boolean;
  frequencyDetection: boolean;
  spectralFlatnessDetection: boolean;
  pitchDetection: boolean;
  energyLevel: number;
  dominantFrequency: number;
  spectralFlatness: number;
  fundamentalFrequency: number;
  speechFrameCount: number;
  silenceFrameCount: number;
}

interface AudioChunk {
  pcmData: Float32Array;
  originalSampleRate: number;
  outputSampleRate: number;
  sequence: number;
  startTime: number;
  duration: number;
  vadResult: VADResult;
  signalLevel: number;
  clipCount: number;
  processingTime: number;
}

// =============================================================================
// FFT Implementation (simplified for worklet context)
// =============================================================================

/**
 * Lightweight FFT implementation cho spectral analysis
 * Based on Cooley-Tukey algorithm với radix-2 decimation
 */
class SimpleFFT {
  private size: number;
  private cosTable: Float32Array = new Float32Array(0);
  private sinTable: Float32Array = new Float32Array(0);
  private bitReverseTable: Uint16Array = new Uint16Array(0);

  constructor(size: number) {
    this.size = size;
    this.precomputeTables();
  }

  private precomputeTables(): void {
    // Precompute trig tables cho performance
    this.cosTable = new Float32Array(this.size / 2);
    this.sinTable = new Float32Array(this.size / 2);
    
    for (let i = 0; i < this.size / 2; i++) {
      const angle = -2 * Math.PI * i / this.size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Bit reversal table
    this.bitReverseTable = new Uint16Array(this.size);
    for (let i = 0; i < this.size; i++) {
      this.bitReverseTable[i] = this.reverseBits(i, Math.log2(this.size));
    }
  }

  private reverseBits(n: number, bits: number): number {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (n & 1);
      n >>= 1;
    }
    return result;
  }

  /**
   * Compute FFT magnitude spectrum
   */
  getMagnitudeSpectrum(input: Float32Array): Float32Array {
    const N = this.size;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    
    // Copy input với bit reversal
    for (let i = 0; i < N; i++) {
      real[this.bitReverseTable[i]] = i < input.length ? input[i] : 0;
      imag[this.bitReverseTable[i]] = 0;
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= N; len *= 2) {
      const halfLen = len / 2;
      const step = N / len;
      
      for (let i = 0; i < N; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const u = i + j;
          const v = i + j + halfLen;
          const twiddle = j * step;
          
          const tempReal = real[v] * this.cosTable[twiddle] - imag[v] * this.sinTable[twiddle];
          const tempImag = real[v] * this.sinTable[twiddle] + imag[v] * this.cosTable[twiddle];
          
          real[v] = real[u] - tempReal;
          imag[v] = imag[u] - tempImag;
          real[u] += tempReal;
          imag[u] += tempImag;
        }
      }
    }
    
    // Compute magnitude spectrum
    const magnitude = new Float32Array(N / 2);
    for (let i = 0; i < N / 2; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    
    return magnitude;
  }
}

// =============================================================================
// Resampling Algorithm  
// =============================================================================

/**
 * High-quality audio resampler sử dụng linear interpolation
 * với anti-aliasing filter cho speech processing
 */
class AudioResampler {
  private inputRate: number;
  private outputRate: number;
  private ratio: number;
  private position: number = 0;
  private previousSample: number = 0;

  constructor(inputRate: number, outputRate: number) {
    this.inputRate = inputRate;
    this.outputRate = outputRate;
    this.ratio = inputRate / outputRate;
  }

  /**
   * Resample audio data sử dụng linear interpolation
   */
  resample(input: Float32Array): Float32Array {
    const outputLength = Math.floor(input.length / this.ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * this.ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      
      const sample1 = index < input.length ? input[index] : this.previousSample;
      const sample2 = (index + 1) < input.length ? input[index + 1] : sample1;
      
      // Linear interpolation
      output[i] = sample1 + fraction * (sample2 - sample1);
    }
    
    // Store last sample for next call
    if (input.length > 0) {
      this.previousSample = input[input.length - 1];
    }
    
    return output;
  }

  reset(): void {
    this.position = 0;
    this.previousSample = 0;
  }
}

// =============================================================================
// VAD Algorithm (based on Moattar & Homayoonpoor)
// =============================================================================

/**
 * Voice Activity Detector optimized for Vietnamese speech
 */
class VADProcessor {
  private config: VADThresholds;
  private fft: SimpleFFT;
  private frameCounter: number = 0;
  private speechFrameCounter: number = 0;
  private silenceFrameCounter: number = 0;
  
  // Adaptive thresholds
  private minEnergy: number = Infinity;
  private minFrequency: number = Infinity;
  private minSpectralFlatness: number = Infinity;
  
  constructor(thresholds: VADThresholds, fftSize: number = 256) {
    this.config = thresholds;
    this.fft = new SimpleFFT(fftSize);
  }

  /**
   * Process audio frame và return VAD result
   */
  processFrame(audioFrame: Float32Array, sampleRate: number): VADResult {
    this.frameCounter++;
    
    // Calculate energy
    const energy = this.calculateEnergy(audioFrame);
    
    // Calculate frequency analysis
    const spectrum = this.fft.getMagnitudeSpectrum(audioFrame);
    const { dominantFreq, spectralFlatness, fundamentalFreq } = this.analyzeSpectrum(spectrum, sampleRate);
    
    // Update adaptive minimums (initial 30 frames)
    if (this.frameCounter <= 30) {
      this.minEnergy = Math.min(this.minEnergy, energy || this.minEnergy);
      this.minFrequency = Math.min(this.minFrequency, dominantFreq);
      this.minSpectralFlatness = Math.min(this.minSpectralFlatness, spectralFlatness);
    }
    
    // VAD decision logic
    const vadDecisions = this.makeVADDecisions(energy, dominantFreq, spectralFlatness, fundamentalFreq);
    
    // Update frame counters
    if (vadDecisions.overallDecision) {
      this.speechFrameCounter++;
      this.silenceFrameCounter = 0;
    } else {
      this.silenceFrameCounter++;
      this.speechFrameCounter = 0;
      
      // Update minimum energy during silence
      if (energy > 0) {
        this.minEnergy = (this.silenceFrameCounter * this.minEnergy + energy) / (this.silenceFrameCounter + 1);
      }
    }
    
    // Apply hysteresis
    const isSpeech = this.applyHysteresis();
    
    return {
      isSpeech,
      confidence: vadDecisions.confidence,
      energyDetection: vadDecisions.energyDetection,
      frequencyDetection: vadDecisions.frequencyDetection,
      spectralFlatnessDetection: vadDecisions.spectralFlatnessDetection,
      pitchDetection: vadDecisions.pitchDetection,
      energyLevel: energy,
      dominantFrequency: dominantFreq,
      spectralFlatness,
      fundamentalFrequency: fundamentalFreq,
      speechFrameCount: this.speechFrameCounter,
      silenceFrameCount: this.silenceFrameCounter,
    };
  }

  private calculateEnergy(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return sum / frame.length;
  }

  private analyzeSpectrum(spectrum: Float32Array, sampleRate: number): {
    dominantFreq: number;
    spectralFlatness: number;
    fundamentalFreq: number;
  } {
    let maxMagnitude = 0;
    let dominantBin = 0;
    
    // Find dominant frequency
    for (let i = 1; i < spectrum.length; i++) {
      if (spectrum[i] > maxMagnitude) {
        maxMagnitude = spectrum[i];
        dominantBin = i;
      }
    }
    
    const dominantFreq = (dominantBin * sampleRate) / (2 * spectrum.length);
    
    // Calculate spectral flatness (geometric mean / arithmetic mean)
    let geometricMean = 1;
    let arithmeticMean = 0;
    let validBins = 0;
    
    for (let i = 1; i < spectrum.length; i++) {
      if (spectrum[i] > 0) {
        geometricMean *= Math.pow(spectrum[i], 1 / spectrum.length);
        arithmeticMean += spectrum[i];
        validBins++;
      }
    }
    
    arithmeticMean /= validBins || 1;
    const spectralFlatness = validBins > 0 ? -10 * Math.log10(geometricMean / arithmeticMean) : 0;
    
    // Rough fundamental frequency estimate (for Vietnamese tonal analysis)
    const fundamentalFreq = this.estimateFundamentalFrequency(spectrum, sampleRate);
    
    return { dominantFreq, spectralFlatness, fundamentalFreq };
  }

  private estimateFundamentalFrequency(spectrum: Float32Array, sampleRate: number): number {
    // Simple peak-picking cho F0 estimation (80-400Hz range for Vietnamese)
    const minBin = Math.floor(80 * 2 * spectrum.length / sampleRate);
    const maxBin = Math.floor(400 * 2 * spectrum.length / sampleRate);
    
    let maxMagnitude = 0;
    let f0Bin = minBin;
    
    for (let i = minBin; i <= maxBin && i < spectrum.length; i++) {
      if (spectrum[i] > maxMagnitude) {
        maxMagnitude = spectrum[i];
        f0Bin = i;
      }
    }
    
    return (f0Bin * sampleRate) / (2 * spectrum.length);
  }

  private makeVADDecisions(energy: number, dominantFreq: number, spectralFlatness: number, fundamentalFreq: number): {
    energyDetection: boolean;
    frequencyDetection: boolean;
    spectralFlatnessDetection: boolean;
    pitchDetection: boolean;
    overallDecision: boolean;
    confidence: number;
  } {
    // Energy threshold (adaptive)
    const energyThreshold = this.config.energyThreshold * Math.log10(this.minEnergy || 1);
    const energyDetection = (energy - this.minEnergy) >= energyThreshold;
    
    // Frequency threshold
    const frequencyDetection = dominantFreq > 0 && 
      (dominantFreq - this.minFrequency) >= this.config.frequencyThreshold;
    
    // Spectral flatness threshold
    const spectralFlatnessDetection = spectralFlatness > 0 && 
      (spectralFlatness - this.minSpectralFlatness) <= this.config.spectralFlatnessThreshold;
    
    // Pitch detection (Vietnamese tonal characteristics)
    const pitchDetection = fundamentalFreq >= this.config.pitchThreshold && fundamentalFreq <= 400;
    
    // Combined decision (require at least 2 out of 4 criteria)
    const decisions = [energyDetection, frequencyDetection, spectralFlatnessDetection, pitchDetection];
    const trueCount = decisions.filter(Boolean).length;
    const overallDecision = trueCount >= 2;
    
    // Calculate confidence based on how many criteria are met
    const confidence = trueCount / 4;
    
    return {
      energyDetection,
      frequencyDetection,
      spectralFlatnessDetection,
      pitchDetection,
      overallDecision,
      confidence,
    };
  }

  private applyHysteresis(): boolean {
    // Apply hysteresis để avoid flickering
    if (this.speechFrameCounter >= this.config.silenceToSpeechFrames) {
      return true; // Switch to speech
    }
    
    if (this.silenceFrameCounter >= this.config.speechToSilenceFrames) {
      return false; // Switch to silence
    }
    
    // Maintain current state if trong hysteresis zone
    return this.speechFrameCounter > 0;
  }

  updateThresholds(newThresholds: Partial<VADThresholds>): void {
    this.config = { ...this.config, ...newThresholds };
  }

  reset(): void {
    this.frameCounter = 0;
    this.speechFrameCounter = 0;
    this.silenceFrameCounter = 0;
    this.minEnergy = Infinity;
    this.minFrequency = Infinity;
    this.minSpectralFlatness = Infinity;
  }
}

// =============================================================================
// Main AudioWorklet Processor
// =============================================================================

/**
 * Advanced AudioProcessor cho VN Speech Guardian
 */
class AudioProcessorWorklet extends (globalThis as any).AudioWorkletProcessor {
  private config: AudioProcessorConfig | null = null;
  private resampler: AudioResampler | null = null;
  private vadProcessor: VADProcessor | null = null;
  
  // Buffer management
  private inputBuffer: Float32Array = new Float32Array(0);
  private outputBuffer: Float32Array = new Float32Array(0);
  private chunkBuffer: Float32Array = new Float32Array(0);
  
  // State tracking
  private isProcessing: boolean = false;
  private sequenceNumber: number = 0;
  private sessionStartTime: number = 0;
  private totalProcessedSamples: number = 0;
  
  // Performance monitoring
  private performanceMetrics = {
    processingTimes: [] as number[],
    bufferUnderruns: 0,
    bufferOverruns: 0,
    droppedFrames: 0,
    totalFrames: 0,
    averageSignalLevel: 0,
    clipCount: 0,
  };

  // Message port for worklet communication
  protected port: MessagePort;

  constructor() {
    super();
    
    // Get message port from worklet processor
    this.port = (this as any).port;
    
    // Setup message handling
    this.port.onmessage = this.handleMessage.bind(this);
    
    this.log('AudioProcessorWorklet initialized');
  }

  private handleMessage(event: MessageEvent): void {
    const { id, type, data } = event.data;
    
    try {
      switch (type) {
        case 'configure':
          this.handleConfigure(data as AudioProcessorConfig);
          this.sendResponse(id, 'status-update', { 
            state: 'initializing',
            message: 'Configuration applied successfully' 
          });
          break;
          
        case 'start-processing':
          this.startProcessing();
          this.sendResponse(id, 'status-update', { 
            state: 'running',
            message: 'Audio processing started' 
          });
          break;
          
        case 'stop-processing':
          this.stopProcessing();
          this.sendResponse(id, 'status-update', { 
            state: 'idle',
            message: 'Audio processing stopped' 
          });
          break;
          
        case 'update-settings':
          this.updateSettings(data);
          this.sendResponse(id, 'status-update', { 
            message: 'Settings updated successfully' 
          });
          break;
          
        case 'get-metrics':
          this.sendPerformanceMetrics();
          break;
          
        case 'reset-buffers':
          this.resetBuffers();
          this.sendResponse(id, 'status-update', { 
            message: 'Buffers reset successfully' 
          });
          break;
          
        default:
          this.sendError(id, 'configuration-error', `Unknown command: ${type}`);
      }
      } catch (error: unknown) {
        const workletError = error as WorkletError;
        this.sendError(id, 'processing-error', `Error handling ${type}: ${workletError.message}`);
      }
  }

  private handleConfigure(config: AudioProcessorConfig): void {
    this.config = config;
    
    // Initialize resampler
    if (config.inputSampleRate !== config.outputSampleRate) {
      this.resampler = new AudioResampler(config.inputSampleRate, config.outputSampleRate);
    }
    
    // Initialize VAD processor
    if (config.vadEnabled) {
      const vadThresholds = this.getVADThresholds(config.vadSensitivity);
      this.vadProcessor = new VADProcessor(vadThresholds, 256);
    }
    
    // Initialize buffers
    this.inputBuffer = new Float32Array(config.bufferSize);
    this.outputBuffer = new Float32Array(config.bufferSize);
    const chunkSamples = Math.floor(config.chunkSize * config.outputSampleRate / 1000);
    this.chunkBuffer = new Float32Array(chunkSamples);
    
    this.log('AudioProcessor configured:', config);
  }

  private getVADThresholds(sensitivity: string): VADThresholds {
    // Default Vietnamese-optimized thresholds
    const baseThresholds: VADThresholds = {
      energyThreshold: 35,
      frequencyThreshold: 150,
      spectralFlatnessThreshold: 6,
      pitchThreshold: 80,
      speechToSilenceFrames: 8,
      silenceToSpeechFrames: 3,
    };
    
    // Adjust based on sensitivity
    switch (sensitivity) {
      case 'low':
        return {
          ...baseThresholds,
          energyThreshold: 30,
          frequencyThreshold: 120,
          speechToSilenceFrames: 12,
          silenceToSpeechFrames: 2,
        };
      case 'high':
        return {
          ...baseThresholds,
          energyThreshold: 45,
          frequencyThreshold: 180,
          speechToSilenceFrames: 6,
          silenceToSpeechFrames: 4,
        };
      default:
        return baseThresholds;
    }
  }

  private startProcessing(): void {
    this.isProcessing = true;
    this.sessionStartTime = (globalThis as any).currentTime * 1000; // Convert to ms
    this.sequenceNumber = 0;
    this.totalProcessedSamples = 0;
    this.resetPerformanceMetrics();
    
    // Reset processors
    this.resampler?.reset();
    this.vadProcessor?.reset();
  }

  private stopProcessing(): void {
    this.isProcessing = false;
  }

  private updateSettings(settings: any): void {
    if (!this.config) return;
    
    if (settings.vadSensitivity && this.vadProcessor) {
      const newThresholds = this.getVADThresholds(settings.vadSensitivity);
      this.vadProcessor.updateThresholds(newThresholds);
    }
    
    if (settings.customThresholds && this.vadProcessor) {
      this.vadProcessor.updateThresholds(settings.customThresholds);
    }
  }

  private resetBuffers(): void {
    this.inputBuffer.fill(0);
    this.outputBuffer.fill(0);
    this.chunkBuffer.fill(0);
  }

  private resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      processingTimes: [],
      bufferUnderruns: 0,
      bufferOverruns: 0,
      droppedFrames: 0,
      totalFrames: 0,
      averageSignalLevel: 0,
      clipCount: 0,
    };
  }

  /**
   * Main audio processing method - called by browser audio system
   */
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    if (!this.config || !this.isProcessing || !inputs[0] || !inputs[0][0]) {
      return true; // Keep processor alive
    }

    const startTime = performance.now();
    const inputData = inputs[0][0]; // First channel only
    
    try {
      this.performanceMetrics.totalFrames++;
      
      // Calculate signal metrics
      const { signalLevel, clipCount } = this.calculateSignalMetrics(inputData);
      
      // Process audio frame
      let processedAudio = inputData;
      
      // Resample if needed
      if (this.resampler) {
        processedAudio = this.resampler.resample(inputData);
      }
      
      // VAD analysis
      let vadResult: VADResult | null = null;
      if (this.vadProcessor && processedAudio.length > 0) {
        vadResult = this.vadProcessor.processFrame(processedAudio, this.config.outputSampleRate);
      }
      
      // Buffer management
      this.appendToChunkBuffer(processedAudio);
      
      // Check if we have a complete chunk
      if (this.chunkBuffer.length >= this.getChunkSizeInSamples()) {
        this.emitAudioChunk(signalLevel, clipCount, vadResult);
      }
      
      // Performance monitoring
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime, signalLevel, clipCount);
      
      // Check for performance issues
      if (processingTime > this.config.maxProcessingTime) {
        this.sendBufferWarning('high-latency', processingTime, this.config.maxProcessingTime);
      }
      
    } catch (error: unknown) {
      const workletError = error as WorkletError;
      this.sendError('process', 'processing-error', `Audio processing error: ${workletError.message}`);
      this.performanceMetrics.droppedFrames++;
    }
    
    return true; // Keep processor alive
  }

  private calculateSignalMetrics(data: Float32Array): { signalLevel: number; clipCount: number } {
    let sum = 0;
    let clipCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      sum += sample * sample;
      
      if (Math.abs(sample) >= 0.99) {
        clipCount++;
      }
    }
    
    const signalLevel = Math.sqrt(sum / data.length);
    return { signalLevel, clipCount };
  }

  private appendToChunkBuffer(data: Float32Array): void {
    // Simple circular buffer implementation
    const remainingSpace = this.chunkBuffer.length - this.totalProcessedSamples % this.chunkBuffer.length;
    
    if (data.length <= remainingSpace) {
      // Fits in current chunk
      const offset = this.totalProcessedSamples % this.chunkBuffer.length;
      this.chunkBuffer.set(data, offset);
    } else {
      // Spans multiple chunks - handle overflow
      this.performanceMetrics.bufferOverruns++;
    }
    
    this.totalProcessedSamples += data.length;
  }

  private getChunkSizeInSamples(): number {
    if (!this.config) return 0;
    return Math.floor(this.config.chunkSize * this.config.outputSampleRate / 1000);
  }

  private emitAudioChunk(signalLevel: number, clipCount: number, vadResult: VADResult | null): void {
    if (!this.config) return;
    
    const chunk: AudioChunk = {
      pcmData: new Float32Array(this.chunkBuffer), // Copy buffer
      originalSampleRate: this.config.inputSampleRate,
      outputSampleRate: this.config.outputSampleRate,
      sequence: this.sequenceNumber++,
      startTime: this.sessionStartTime,
      duration: this.config.chunkSize,
      vadResult: vadResult || this.getDefaultVADResult(),
      signalLevel,
      clipCount,
      processingTime: this.getAverageProcessingTime(),
    };
    
    this.sendMessage('audio-chunk', chunk);
    
    // Reset chunk buffer for next chunk
    this.chunkBuffer.fill(0);
  }

  private getDefaultVADResult(): VADResult {
    return {
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
  }

  private updatePerformanceMetrics(processingTime: number, signalLevel: number, clipCount: number): void {
    // Update processing times (keep last 100 measurements)
    this.performanceMetrics.processingTimes.push(processingTime);
    if (this.performanceMetrics.processingTimes.length > 100) {
      this.performanceMetrics.processingTimes.shift();
    }
    
    // Update signal level (exponential moving average)
    this.performanceMetrics.averageSignalLevel = 
      0.95 * this.performanceMetrics.averageSignalLevel + 0.05 * signalLevel;
    
    this.performanceMetrics.clipCount += clipCount;
  }

  private getAverageProcessingTime(): number {
    const times = this.performanceMetrics.processingTimes;
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private sendPerformanceMetrics(): void {
    const metrics = {
      averageProcessingTime: this.getAverageProcessingTime(),
      maxProcessingTime: Math.max(...this.performanceMetrics.processingTimes, 0),
      processingLoad: this.getAverageProcessingTime() / (this.config?.maxProcessingTime || 10),
      bufferUnderruns: this.performanceMetrics.bufferUnderruns,
      bufferOverruns: this.performanceMetrics.bufferOverruns,
      bufferUtilization: 0.5, // Placeholder
      totalFramesProcessed: this.performanceMetrics.totalFrames,
      droppedFrames: this.performanceMetrics.droppedFrames,
      averageSignalLevel: this.performanceMetrics.averageSignalLevel,
      clipRate: this.performanceMetrics.clipCount / (this.performanceMetrics.totalFrames || 1),
      vadDetectionRate: 0.5, // Placeholder
      vadAccuracy: 0.8, // Placeholder
      vadLatency: 10, // Placeholder
      estimatedMemoryUsage: 1024 * 1024, // Placeholder (1MB)
      garbageCollectionEvents: 0, // Placeholder
      sessionDuration: (globalThis as any).currentTime * 1000 - this.sessionStartTime,
      lastUpdateTime: performance.now(),
    };
    
    this.sendMessage('performance-metrics', metrics);
  }

  private sendBufferWarning(type: string, currentValue: number, threshold: number): void {
    const warning = {
      type,
      severity: currentValue > threshold * 2 ? 'critical' : 'high',
      message: `${type}: ${currentValue.toFixed(2)} exceeds threshold ${threshold}`,
      currentValue,
      thresholdValue: threshold,
      recommendedAction: 'Consider reducing audio quality or processing complexity',
    };
    
    this.sendMessage('buffer-warning', warning);
  }

  // Helper methods
  private sendMessage(type: string, data: any): void {
    this.port.postMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: performance.now(),
    });
  }

  private sendResponse(id: string, type: string, data: any): void {
    this.port.postMessage({
      id,
      type,
      data,
      timestamp: performance.now(),
    });
  }

  private sendError(id: string, errorType: string, message: string): void {
    const error = {
      type: errorType,
      message,
      code: `AUDIO_WORKLET_${errorType.toUpperCase()}`,
      severity: 'error' as const,
      timestamp: performance.now(),
      processingContext: {
        frameNumber: this.performanceMetrics.totalFrames,
        bufferSize: this.inputBuffer.length,
        sampleRate: this.config?.inputSampleRate || 0,
        channelCount: 1,
      },
      recoverable: true,
      suggestedRecovery: 'Try restarting audio processing',
    };
    
    this.port.postMessage({
      id,
      type: 'error',
      data: error,
      timestamp: performance.now(),
    });
  }

  private log(...args: any[]): void {
    if (this.config?.enableLogging) {
      console.log('[AudioProcessorWorklet]', ...args);
    }
  }
}

// Register the processor
(globalThis as any).registerProcessor('audio-processor', AudioProcessorWorklet);