# P24 - Advanced AudioWorklet Architecture

## Research Summary (September 2024)

### Key Findings from thurti/vad-audio-worklet Analysis:
- **VAD Algorithm**: Based on Moattar & Homayoonpoor research paper
- **Features**: Energy detection, spectral flatness analysis, frequency analysis
- **Performance**: Uses FFT.js for spectral analysis with 128-point FFT
- **Real-time**: Processes audio in 10ms frames (frame_size_ms = 10)
- **Thresholds**: Configurable energy (40), frequency (185Hz), spectral flatness (5)

### Modern AudioWorklet Best Practices 2024:
- **Message Passing**: Use structured messages với command patterns
- **Performance**: Minimize allocations in process() method
- **Type Safety**: Proper TypeScript definitions for worklet interfaces
- **Browser Support**: Chrome 66+, Firefox 76+, Safari 14.1+
- **Security**: Secure contexts (HTTPS) required

## Proposed Architecture

### Core Components:

#### 1. AudioWorklet (`public/worklets/audio-processor.ts`)
```typescript
class AudioProcessorWorklet extends AudioWorkletProcessor {
  // Core functionality:
  // - Input buffering and resampling (48kHz → 16kHz)
  // - VAD detection với Vietnamese speech optimization
  // - PCM chunk preparation for Socket.IO streaming
  // - Performance monitoring và error handling
}
```

#### 2. Audio Hook (`src/hooks/use-audio.ts`)
```typescript
export function useAudio() {
  // Features:
  // - MediaStream acquisition và permission handling
  // - AudioWorklet instantiation và lifecycle
  // - Real-time VAD state management
  // - Performance metrics collection
  // - Error boundary integration
}
```

#### 3. TypeScript Definitions (`src/types/audio.ts`)
```typescript
// Comprehensive type definitions:
// - AudioWorkletMessage interfaces
// - VAD detection results
// - Performance metrics
// - Audio configuration options
```

### Technical Specifications:

#### Resampling Algorithm:
- **Input**: Native browser sample rate (typically 48kHz)
- **Output**: 16kHz for AI processing optimization
- **Method**: Linear interpolation với anti-aliasing filter
- **Latency Target**: <10ms total processing delay
- **Quality**: Preserve speech intelligibility for Vietnamese tones

#### VAD Detection Enhancement:
- **Base Algorithm**: Port from thurti/vad-audio-worklet
- **Vietnamese Optimization**: Adjust frequency thresholds for tonal language
- **Features**:
  - Energy detection với adaptive thresholds
  - Spectral flatness analysis (voiced vs unvoiced)
  - Fundamental frequency analysis (pitch tracking)
  - Silence suppression với hysteresis

#### Performance Requirements:
- **CPU Usage**: <5% on modern desktop browsers
- **Memory**: <50MB total audio processing footprint
- **Latency**: End-to-end <100ms (microphone → VAD result)
- **Throughput**: Real-time processing of continuous audio streams

#### Buffer Management:
- **Input Buffering**: Circular buffer cho smooth audio capture
- **Chunk Assembly**: 200-400ms chunks cho Socket.IO transmission
- **Overflow Handling**: Graceful degradation under high CPU load
- **Memory Optimization**: Reuse buffers, minimize garbage collection

### Integration Points:

#### 1. Socket.IO Streaming (P25 dependency)
```typescript
// AudioWorklet → useSocket hook
interface AudioChunkMessage {
  type: 'audio-chunk';
  data: ArrayBuffer; // PCM 16-bit 16kHz
  sequence: number;
  vadResult: VADResult;
  timestamp: number;
}
```

#### 2. Live UI Integration (P26 dependency)
```typescript
// Real-time state updates
interface AudioState {
  isRecording: boolean;
  vadActive: boolean;
  audioLevel: number; // 0-1 normalized
  sampleRate: number;
  bufferHealth: 'good' | 'warning' | 'critical';
}
```

### Browser Compatibility Strategy:

#### Supported Browsers:
- **Chrome 66+**: Full AudioWorklet support
- **Firefox 76+**: Full support với sample rate limitations
- **Safari 14.1+**: Basic support với permission quirks
- **Edge 79+**: Chromium-based, full support

#### Fallback Strategy:
- **Legacy Browsers**: ScriptProcessorNode fallback (deprecated but functional)
- **Permission Denied**: Clear error messages với recovery suggestions
- **Unsupported Features**: Graceful degradation to basic audio capture

### Testing Strategy:

#### Unit Tests:
- **Resampling Accuracy**: Test với known audio signals
- **VAD Detection**: Test với Vietnamese speech samples
- **Buffer Management**: Stress test với varying audio loads
- **Message Passing**: Test all AudioWorklet ↔ main thread communication

#### Integration Tests:
- **End-to-End Pipeline**: Microphone → VAD → Socket.IO
- **Performance Testing**: CPU/memory usage under sustained load
- **Browser Compatibility**: Automated testing across browsers
- **Error Handling**: Network failures, permission denials, CPU overload

#### Test Data:
- **Vietnamese Speech Samples**: Male/female voices, different tones
- **Noise Scenarios**: Background noise, music, silence
- **Edge Cases**: Very quiet/loud audio, microphone switching

### Performance Monitoring:

#### Real-time Metrics:
```typescript
interface AudioMetrics {
  processingTime: number; // ms per audio frame
  bufferUnderruns: number; // count of audio gaps
  vadAccuracy: number; // estimated accuracy percentage
  cpuUsage: number; // estimated CPU percentage
  memoryUsage: number; // heap size in MB
}
```

#### Performance Targets:
- **Processing Time**: <5ms per 128-sample frame
- **Buffer Health**: <1% underrun rate
- **CPU Usage**: <5% average on mid-range devices
- **Memory Stability**: No memory leaks over 1-hour sessions

## Implementation Plan

### Phase 1: Core AudioWorklet (Tasks 1-5)
1. Research & architecture documentation ✅
2. Basic AudioWorklet infrastructure
3. Resampling algorithm implementation
4. VAD algorithm integration
5. Buffer management system

### Phase 2: Integration & Testing (Tasks 6-8)
6. useAudio hook implementation
7. Comprehensive unit testing
8. Integration testing với audio pipeline

### Phase 3: Documentation & Polish (Task 9)
9. Complete documentation và examples

### Success Criteria:
- [ ] Real-time audio processing với <100ms latency
- [ ] Accurate VAD detection for Vietnamese speech
- [ ] Stable performance over extended sessions
- [ ] Cross-browser compatibility với major browsers
- [ ] Comprehensive test coverage >90%
- [ ] Production-ready error handling và recovery

## Next Steps
Begin implementation với Task 2: Create AudioWorklet Infrastructure