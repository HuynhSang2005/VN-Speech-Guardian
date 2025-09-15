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

  it('get returns a single session', async () => {
    const res = await controller.get('s1');
    expect(res).toHaveProperty('success', true);
    expect(res.data).toHaveProperty('id', 's1');
  });

  it('transcripts returns list', async () => {
    // service returns array of transcripts; controller wraps into { items, total }
    (mockService.listTranscripts as any) = jest.fn().mockResolvedValue([{ id: 't1', text: 'hello' }]);
    const res = await controller.transcripts('s1');
    expect(res).toHaveProperty('success', true);
    // controller returns data.items as the array
    expect(res.data).toHaveProperty('items');
    expect(res.data.items[0]).toHaveProperty('id', 't1');
  });

  it('remove propagates errors', async () => {
    (mockService.remove as jest.Mock).mockRejectedValueOnce(new Error('delboom'));
    await expect(controller.remove('s1')).rejects.toThrow('delboom');
  });
});
