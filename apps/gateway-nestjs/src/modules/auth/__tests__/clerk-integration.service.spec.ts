import { Test } from '@nestjs/testing';
import { ClerkIntegrationService } from '../clerk-integration.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('ClerkIntegrationService', () => {
  let service: ClerkIntegrationService;
  let prisma: Partial<PrismaService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      } as any,
    } as Partial<PrismaService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClerkIntegrationService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ClerkIntegrationService);
    (service as any).clerkClient = {
      users: { getUser: jest.fn().mockResolvedValue({ id: 'c1', emailAddresses: [{ emailAddress: 'a@b.com' }], publicMetadata: {} }) },
    } as any;
  });

  it('falls back to findUnique when upsert/update fails', async () => {
    (prisma.user!.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'u1', clerkId: 'c1', email: 'a@b.com' });
    (prisma.user!.update as jest.Mock).mockRejectedValueOnce(new Error('update failed'));

    const res = await service.getOrCreateUser('c1');
    expect(res.clerkId).toBe('c1');
  });

  it('determineUserRole returns ADMIN when flagged', () => {
    const role = (service as any).determineUserRole({ publicMetadata: { role: 'ADMIN' }, emailAddresses: [{ emailAddress: 'a@b.com' }] });
    expect(role).toBe('ADMIN');
  });

  it('determines ADMIN role by email domain from config', () => {
    const cfg = { get: jest.fn((k: string) => k === 'ADMIN_EMAIL_DOMAINS' ? '@company.com' : undefined) } as any;
    // assign to the private configService used inside the service
    (service as any).configService = cfg;
    const role = (service as any).determineUserRole({ publicMetadata: {}, emailAddresses: [{ emailAddress: 'user@company.com' }] });
    expect(role).toBe('ADMIN');
  });

  it('hasPermission returns true for admin users and false otherwise', async () => {
    // mock prisma responses for two users
    (prisma.user!.findUnique as jest.Mock).mockImplementation(({ where: { id } }: any) => {
      if (id === 'admin') return Promise.resolve({ id: 'admin', role: 'ADMIN' });
      if (id === 'user') return Promise.resolve({ id: 'user', role: 'USER' });
      return Promise.resolve(null);
    });

    await expect(service.hasPermission('admin', 'ANY')).resolves.toBe(true);
    await expect(service.hasPermission('user', 'sessions:read')).resolves.toBe(true);
    await expect(service.hasPermission('user', 'unknown:perm')).resolves.toBe(false);
  });

  it('verifyToken rethrows clerk errors', async () => {
    (service as any).verifyFn = jest.fn().mockRejectedValue(new Error('invalid'));
    await expect(service.verifyToken('badtoken')).rejects.toThrow('invalid');
  });

  it('getOrCreateUser returns existing DB user with ISO createdAt', async () => {
    const dbUser = { id: 'u1', clerkId: 'c1', email: 'a@b.com', createdAt: new Date('2020-01-01T00:00:00Z') } as any;
    (prisma.user!.findUnique as jest.Mock).mockResolvedValueOnce(dbUser);
    const res = await service.getOrCreateUser('c1');
    expect(res.clerkId).toBe('c1');
    expect(res.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('getOrCreateUser throws when clerk user not found', async () => {
    (prisma.user!.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (service as any).clerkClient.users.getUser = jest.fn().mockResolvedValueOnce(null);
    await expect(service.getOrCreateUser('missing')).rejects.toThrow('User not found in Clerk');
  });

  it('creates a new user when not present in DB', async () => {
    (prisma.user!.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const clerkUser = { id: 'c2', emailAddresses: [{ emailAddress: 'new@company.com' }], publicMetadata: {} } as any;
    (service as any).clerkClient.users.getUser = jest.fn().mockResolvedValueOnce(clerkUser);
    const created = { id: 'u2', clerkId: 'c2', email: 'new@company.com', createdAt: new Date('2021-02-02T00:00:00Z') } as any;
    (prisma.user!.create as jest.Mock).mockResolvedValueOnce(created);

    const res = await service.getOrCreateUser('c2');
    expect(res.clerkId).toBe('c2');
    expect(res.createdAt).toBe('2021-02-02T00:00:00.000Z');
  });

  it('syncUserData updates user when update succeeds', async () => {
    const clerkUser = { id: 'c9', emailAddresses: [{ emailAddress: 's@a.com' }], publicMetadata: {} } as any;
    (service as any).clerkClient.users.getUser = jest.fn().mockResolvedValueOnce(clerkUser);
    const updated = { id: 'u9', clerkId: 'c9', email: 's@a.com', createdAt: new Date('2022-03-03T00:00:00Z') } as any;
    (prisma.user!.update as jest.Mock).mockResolvedValueOnce(updated);

    const res = await service.syncUserData('c9');
    expect(res.clerkId).toBe('c9');
    expect(res.createdAt).toBe('2022-03-03T00:00:00.000Z');
  });

  it('determineUserRole returns ADMIN when publicMetadata.isAdmin is true', () => {
    const role = (service as any).determineUserRole({ publicMetadata: { isAdmin: true }, emailAddresses: [{ emailAddress: 'a@b.com' }] });
    expect(role).toBe('ADMIN');
  });
});
