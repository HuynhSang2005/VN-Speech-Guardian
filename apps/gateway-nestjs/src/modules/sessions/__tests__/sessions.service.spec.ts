import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../sessions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const mockPrisma = {
    session: {
      create: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', startedAt: new Date() }),
      findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', startedAt: new Date() }),
      findMany: jest.fn().mockResolvedValue([{ id: 's1', userId: 'u1', startedAt: new Date() }]),
      count: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue({ id: 's1' }),
    },
    transcript: {
      findMany: jest.fn().mockResolvedValue([
        { id: 't1', sessionId: 's1', segIdx: 0, text: 'hello', startMs: 0, endMs: 100 },
      ]),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should create session', async () => {
    const res = await service.create({ userId: 'u1' });
    expect(res).toHaveProperty('id', 's1');
  });

  it('should list sessions', async () => {
    const res = await service.list(1, 10);
    expect(res).toHaveProperty('total', 1);
    expect(res.items).toHaveLength(1);
  });

  it('should list transcripts for a session', async () => {
    const res = await service.listTranscripts('s1');
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('id', 't1');
  });

  it('get throws NotFoundException when session missing', async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.get('missing')).rejects.toThrow('Session not found');
  });

  it('list calculates skip/take correctly for pagination', async () => {
    const spyFindMany = mockPrisma.session.findMany as jest.Mock;
    await service.list(2, 5);
    expect(spyFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5, orderBy: { startedAt: 'desc' } }));
  });

  it('listTranscripts throws when transcript validation fails', async () => {
    (mockPrisma.transcript.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'bad', sessionId: 's1', segIdx: 0, text: 123 }]);
    await expect(service.listTranscripts('s1')).rejects.toThrow();
  });

  it('create handles session without startedAt gracefully', async () => {
    (mockPrisma.session.create as jest.Mock).mockResolvedValueOnce({ id: 's2', userId: 'u2' });
    const res = await service.create({ userId: 'u2' });
    expect(res).toHaveProperty('id', 's2');
    expect(res.startedAt).toBeUndefined();
  });

  it('remove delegates to repo and returns result', async () => {
    (mockPrisma.session.delete as jest.Mock).mockResolvedValueOnce({ id: 's1' });
    const res = await service.remove('s1');
    expect(res).toHaveProperty('id', 's1');
  });
});
