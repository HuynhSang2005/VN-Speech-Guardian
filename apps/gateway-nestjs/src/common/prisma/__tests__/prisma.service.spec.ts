import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let svc: PrismaService;

  beforeEach(() => {
    svc = new PrismaService();
    // mock $connect/$disconnect to avoid real DB calls
    (svc as any).$connect = jest.fn().mockResolvedValue(undefined);
    (svc as any).$disconnect = jest.fn().mockResolvedValue(undefined);
    (svc as any).$on = jest.fn();
  });

  it('connects on init', async () => {
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
    expect((svc as any).$connect).toHaveBeenCalled();
  });

  it('disconnects on destroy', async () => {
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect((svc as any).$disconnect).toHaveBeenCalled();
  });

  it('enableShutdownHooks registers beforeExit handler', () => {
    const fakeApp: any = { close: jest.fn() };
    (svc as any).$on = jest.fn((ev: string, cb: Function) => {
      // simulate call
      if (ev === 'beforeExit') cb();
    });
    svc.enableShutdownHooks(fakeApp);
    expect((svc as any).$on).toHaveBeenCalledWith('beforeExit', expect.any(Function));
  });
});
