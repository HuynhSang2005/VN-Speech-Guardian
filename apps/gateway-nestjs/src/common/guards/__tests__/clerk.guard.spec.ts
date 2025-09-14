import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClerkGuard } from '../clerk.guard';
import { ClerkIntegrationService } from '../../../modules/auth/clerk-integration.service';

describe('ClerkGuard', () => {
  let guard: ClerkGuard;
  let clerk: Partial<ClerkIntegrationService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClerkGuard,
        {
          provide: ClerkIntegrationService,
          useValue: {},
        },
        // provide a minimal ConfigService mock because ClerkGuard injects it
        {
          provide: 'ConfigService',
          useValue: {},
        },
        {
          provide: (await import('@nestjs/config')).ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    guard = moduleRef.get<ClerkGuard>(ClerkGuard);
    clerk = moduleRef.get(ClerkIntegrationService);
  });

  function mockContext(authHeader?: string): Partial<ExecutionContext> {
    const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
    const res: any = {};
    const next: any = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
        getNext: () => next,
      }),
    };
  }

  it('should attach user when token is valid', async () => {
    (clerk.verifyToken as any) = jest.fn().mockResolvedValue({ sub: 'user1', email: 'a@b.com' });
    (clerk.getOrCreateUser as any) = jest.fn().mockResolvedValue({
      id: 'u1',
      clerkId: 'user1',
      email: 'a@b.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    });
    const ctx = mockContext('Bearer goodtoken') as ExecutionContext;

    const can = await guard.canActivate(ctx);
    expect(can).toBe(true);
    // ensure user attached on request
    const req = (ctx.switchToHttp().getRequest as any)();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('a@b.com');
  });

  it('should deny when authorization header missing', async () => {
    const ctx = mockContext() as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should deny when token invalid', async () => {
    (clerk.verifyToken as any) = jest.fn().mockRejectedValue(new Error('invalid'));
    const ctx = mockContext('Bearer badtoken') as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
