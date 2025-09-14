import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from '../stats.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;

  const mockPrisma = {
    session: { count: jest.fn().mockResolvedValue(5) },
    detection: { count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(3) },
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ total_ms: 600000 }]), // 10 minutes
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  it('should compute overview', async () => {
    const res = await service.overview();
    expect(res).toHaveProperty('sessions', 5);
    expect(res).toHaveProperty('minutes');
    expect(res).toHaveProperty('toxicPercent');
  });
});
