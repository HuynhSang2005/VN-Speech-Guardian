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
});
