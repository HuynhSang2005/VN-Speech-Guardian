/**
 * Mục đích: Zod schemas và types cho AI Worker domain
 * Sử dụng: Type-safe validation cho audio processing workflows
 */

import { z } from 'zod';

// Network Performance Metrics Schema
export const NetworkMetricsSchema = z.object({
  latency: z.number().positive(), // milliseconds
  throughput: z.number().positive(), // bytes per second  
  timestamp: z.number().optional(), // optional timestamp
});

// Chunking Constraints Schema
export const ChunkingConstraintsSchema = z.object({
  minChunkSize: z.number().positive(), // bytes
  maxChunkSize: z.number().positive(), // bytes
  defaultChunkSize: z.number().positive(), // bytes
});

// Audio Chunk Schema
export const AudioChunkSchema = z.object({
  sequenceId: z.number().int().nonnegative(), // chunk order
  data: z.instanceof(Buffer), // audio data
  size: z.number().positive(), // data size in bytes
});

// Chunked Audio Result Schema
export const ChunkedAudioResultSchema = z.object({
  sessionId: z.string().min(1), // session identifier
  totalChunks: z.number().int().positive(), // total number of chunks
  chunks: z.array(AudioChunkSchema), // array of chunks với metadata
});

// AI Worker Metrics Schema
export const AIWorkerMetricsSchema = z.object({
  averageProcessingTime: z.number().positive(), // milliseconds per chunk
  queueDepth: z.number().int().nonnegative(), // pending chunks in queue
  cpuUsage: z.number().min(0).max(1), // 0-1 CPU utilization
});

// Streaming Metrics Schema
export const StreamingMetricsSchema = z.object({
  targetLatency: z.number().positive(), // target latency in ms
  currentLatency: z.number().positive(), // current actual latency
  processingBacklog: z.number().int().nonnegative(), // chunks waiting
});

// Chunking Metrics Schema
export const ChunkingMetricsSchema = z.object({
  totalChunks: z.number().int().nonnegative(), // total chunks processed
  averageChunkSize: z.number().positive(), // average size in bytes
  chunkingLatency: z.number().nonnegative(), // average chunking time in ms
  optimalChunkSize: z.number().positive(), // calculated optimal size
});

// Connection Pool Status Schema
export const ConnectionPoolStatusSchema = z.object({
  activeConnections: z.number().int().nonnegative(),
  freeConnections: z.number().int().nonnegative(),
  pendingRequests: z.number().int().nonnegative(),
  totalRequests: z.number().int().nonnegative(),
  connectionReused: z.number().int().nonnegative(),
});

// AI Service Response Schema
export const AIServiceResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  partial: z.object({
    text: z.string(),
  }).optional(),
  final: z.object({
    text: z.string(),
    words: z.array(z.object({
      word: z.string(),
      start: z.number(),
      end: z.number(),
      confidence: z.number(),
    })).optional(),
  }).optional(),
  detections: z.array(z.object({
    label: z.enum(['CLEAN', 'OFFENSIVE', 'HATE']),
    score: z.number().min(0).max(1),
    startMs: z.number().nonnegative(),
    endMs: z.number().nonnegative(),
    snippet: z.string(),
  })).default([]),
  error: z.string().optional(),
});

// Exported Types
export type NetworkMetrics = z.infer<typeof NetworkMetricsSchema>;
export type ChunkingConstraints = z.infer<typeof ChunkingConstraintsSchema>;
export type AudioChunk = z.infer<typeof AudioChunkSchema>;
export type ChunkedAudioResult = z.infer<typeof ChunkedAudioResultSchema>;
export type AIWorkerMetrics = z.infer<typeof AIWorkerMetricsSchema>;
export type StreamingMetrics = z.infer<typeof StreamingMetricsSchema>;
export type ChunkingMetrics = z.infer<typeof ChunkingMetricsSchema>;
export type ConnectionPoolStatus = z.infer<typeof ConnectionPoolStatusSchema>;
export type AIServiceResponse = z.infer<typeof AIServiceResponseSchema>;