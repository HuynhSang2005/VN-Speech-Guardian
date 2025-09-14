import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from '../sessions.controller';
import { SessionsService } from '../sessions.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', startedAt: new Date().toISOString() }),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    get: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', startedAt: new Date().toISOString() }),
    remove: jest.fn().mockResolvedValue(true),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: mockService }],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('list returns paginated data', async () => {
    const res = await controller.list({}, 1, 10);
    expect(res).toBeDefined();
    expect(mockService.list).toHaveBeenCalledWith(1, 10);
  });

  it('propagates errors from service', async () => {
    (mockService.list as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(controller.list({}, 1, 10)).rejects.toThrow('boom');
  });

  it('create returns session', async () => {
    const res = await controller.create({ userId: 'u1' } as any);
    expect(res).toHaveProperty('success', true);
    expect(res.data).toHaveProperty('id', 's1');
  });
});
