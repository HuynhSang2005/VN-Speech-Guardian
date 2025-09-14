import { Test } from '@nestjs/testing';
import { AiWorkerService } from '../ai-worker.service';
import { ConfigService } from '@nestjs/config';

describe('AiWorkerService', () => {
  let svc: AiWorkerService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [AiWorkerService, { provide: ConfigService, useValue: { get: () => 'http://localhost:8000' } }] }).compile();
    svc = moduleRef.get(AiWorkerService);
  });

  it('forwards audio and parses json', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
    const res = await svc.forwardAudio('s1', Buffer.from([1, 2, 3]));
    expect(res.status).toBe('ok');
    expect((global as any).fetch).toHaveBeenCalled();
  });

  it('throws on non-ok response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' });
    await expect(svc.forwardAudio('s1', Buffer.from([1]))).rejects.toThrow();
  });
});
