// AudioWorklet type declarations for TypeScript
// Based on Web Audio API spec

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare interface AudioWorkletProcessorConstructor {
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
}

declare function registerProcessor(
  name: string,
  processorCtor: AudioWorkletProcessorConstructor
): void;

export {
  AudioWorkletProcessor,
  AudioWorkletProcessorConstructor,
  registerProcessor
};