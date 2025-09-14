import { Test } from '@nestjs/testing';
import { StatsController } from '../stats.controller';
import { StatsService } from '../stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  let service: StatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StatsController],
        providers: [
          {
            provide: StatsService,
            useValue: {
              overview: jest.fn().mockResolvedValue({
                sessions: 3,
                minutes: 42,
                toxicPercent: 12.5,
              }),
            },
          },
        ],
    }).compile();

    controller = moduleRef.get<StatsController>(StatsController);
    service = moduleRef.get<StatsService>(StatsService);
  });

  it('should return overview data', async () => {
  const res = await controller.overview();
  expect(res).toBeDefined();
  expect(res.success).toBe(true);
  expect(res.data.sessions).toBe(3);
  expect(service.overview).toHaveBeenCalled();
  });

  it('should propagate errors from service', async () => {
  (service.overview as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  await expect(controller.overview()).rejects.toThrow('boom');
  });
});
