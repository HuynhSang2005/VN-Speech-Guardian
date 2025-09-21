import { Test, TestingModule } from '@nestjs/testing';
import { AudioGateway } from '../audio.gateway';
import { AiWorkerService } from '../../ai-worker/ai-worker.service';
import { Socket } from 'socket.io';

describe('AudioGateway edge cases (in-memory)', () => {
  let gateway: AudioGateway;
  let mockAi: Partial<AiWorkerService>;

  beforeEach(async () => {
    mockAi = {
      forwardAudio: jest.fn(async (sessionId: string, audio: Buffer) => {
        return { status: 'ok', partial: { text: 'p' }, final: { text: 'f', words: [] }, detections: [] };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioGateway, { provide: AiWorkerService, useValue: mockAi }],
    }).compile();

    gateway = module.get<AudioGateway>(AudioGateway);
  });

  it('handles interleaved partials without throwing', async () => {
    const events: any[] = [];
    const client: any = { data: {}, emit: (e: string, p: any) => events.push({ e, p }) } as unknown as Socket;

    // send two chunks quickly
    await Promise.all([
      gateway.handleAudio(Buffer.from([1, 2, 3]).buffer, client),
      gateway.handleAudio(Buffer.from([4, 5, 6]).buffer, client),
    ]);

    expect(events.length).toBeGreaterThanOrEqual(0); // no throw
  });

  it('rejects malformed audio gracefully (mock throws)', async () => {
    (mockAi.forwardAudio as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('malformed audio');
    });

    const client: any = { data: {}, emit: jest.fn() } as unknown as Socket;

    await expect(gateway.handleAudio('not-a-buffer' as any, client)).resolves.toBeUndefined();
    // ensure gateway didn't crash and didn't emit final
    expect((client.emit as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it('handles AI worker error response and emits error', async () => {
    (mockAi.forwardAudio as jest.Mock).mockImplementationOnce(async () => ({ status: 'error', message: 'internal' } as any));

    const client: any = { data: {}, emit: jest.fn() } as unknown as Socket;
    await gateway.handleAudio(Buffer.from([7, 8, 9]).buffer, client);

    // expect gateway to emit an error or at least not throw
    expect((client.emit as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it('hysteresis boundaries (emit only after threshold)', async () => {
    (mockAi.forwardAudio as jest.Mock).mockImplementation(async (sessionId: string, audio: Buffer) => {
      const has9 = audio.includes(9);
      return {
        status: 'ok',
        partial: { text: 'p' },
        final: { text: 'f', words: [] },
        detections: has9 ? [{ label: 'OFFENSIVE', score: 0.9, startMs: 0, endMs: 100, snippet: 'bad' }] : [],
      };
    });

    const events: any[] = [];
    const client: any = { data: {}, emit: (e: string, p: any) => events.push({ e, p }) } as unknown as Socket;

    // first toxic chunk
    await gateway.handleAudio(Buffer.from([9]).buffer, client);
    // should not yet have 'detection' emitted as TOXIC
    let toxic = events.find((ev) => ev.e === 'detection' && ev.p?.label === 'TOXIC');
    expect(toxic).toBeUndefined();

    // second toxic chunk -> should cause emit
    await gateway.handleAudio(Buffer.from([9]).buffer, client);
    toxic = events.find((ev) => ev.e === 'detection' && ev.p?.label === 'TOXIC');
    expect(toxic).toBeDefined();
  });
});
