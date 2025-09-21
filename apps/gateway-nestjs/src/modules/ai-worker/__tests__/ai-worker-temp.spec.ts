/**
 * Mục đích: Quick test fixes để API changes sau refactoring  
 * TEMPORARY: Will be properly rewritten trong todo #6
 */

// Fix API method calls trong existing tests
// TODO: Rewrite tests completely để match new architecture

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiWorkerService } from '../ai-worker.service';
import { AI_WORKER_CONFIG } from '../../../config/ai-worker.config';

describe('AiWorkerService - Quick API Compatibility', () => {
  let service: AiWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiWorkerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:8000'),
          },
        },
      ],
    }).compile();

    service = module.get<AiWorkerService>(AiWorkerService);
  });

  it('nên initialize service với new API', () => {
    expect(service).toBeDefined();
    expect(service.getCurrentBufferSize()).toBeDefined();
    expect(service.getChunkingMetrics()).toBeDefined();
    expect(service.getConnectionPoolStatus()).toBeDefined();
  });

  // TEMPORARY: Basic functionality test
  it('nên return metrics với new structure', () => {
    const bufferSize = service.getCurrentBufferSize();
    expect(typeof bufferSize).toBe('number');
    expect(bufferSize).toBeGreaterThan(0);

    const chunkingMetrics = service.getChunkingMetrics();
    expect(chunkingMetrics).toHaveProperty('totalChunks');
    expect(chunkingMetrics).toHaveProperty('averageChunkSize');
    expect(chunkingMetrics).toHaveProperty('chunkingLatency');
    expect(chunkingMetrics).toHaveProperty('optimalChunkSize');

    const poolStatus = service.getConnectionPoolStatus();
    expect(poolStatus).toHaveProperty('activeConnections');
    expect(poolStatus).toHaveProperty('freeConnections');
  });

  // TODO: Add comprehensive tests cho Phase 6
});