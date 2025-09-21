import { Test, TestingModule } from '@nestjs/testing';
import { AudioGateway } from '../audio.gateway';
import { AiWorkerService } from '../../ai-worker/ai-worker.service';
import { Socket } from 'socket.io';

describe('AudioGateway', () => {
  let gateway: AudioGateway;
  let mockAi: Partial<AiWorkerService>;

  beforeEach(async () => {
    mockAi = {
      forwardAudio: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioGateway, { provide: AiWorkerService, useValue: mockAi }],
    }).compile();

    gateway = module.get<AudioGateway>(AudioGateway);
  });

  it('should emit detection only after hysteresis threshold', async () => {
    // create a fake client socket with minimal API
    const events: any[] = [] as any;
    const client: any = {
      data: {},
      emit: (event: string, payload: any) => events.push({ event, payload }),
    } as unknown as Socket;

    // first two calls: OFFENSIVE detection
    (mockAi.forwardAudio as jest.Mock).mockResolvedValueOnce({ detection: { label: 'OFFENSIVE' } });
    (mockAi.forwardAudio as jest.Mock).mockResolvedValueOnce({ detection: { label: 'OFFENSIVE' } });
    // third call: CLEAN
    (mockAi.forwardAudio as jest.Mock).mockResolvedValueOnce({ detection: { label: 'CLEAN' } });
    // fourth and fifth: CLEAN
    (mockAi.forwardAudio as jest.Mock).mockResolvedValueOnce({ detection: { label: 'CLEAN' } });
    (mockAi.forwardAudio as jest.Mock).mockResolvedValueOnce({ detection: { label: 'CLEAN' } });

    // simulate sending 5 audio chunks
    for (let i = 0; i < 5; i++) {
      await gateway.handleAudio(Buffer.from([1, 2, 3]).buffer, client as any);
    }

    // after two OFFENSIVE, should have emitted a TOXIC detection once
    const toxic = events.find((e) => e.event === 'detection' && e.payload.label === 'TOXIC');
    const clean = events.find((e) => e.event === 'detection' && e.payload.label === 'CLEAN');

    expect(toxic).toBeDefined();
    expect(clean).toBeDefined();
  });
});
