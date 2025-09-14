import { AuthRepository } from '../repository/auth.repo';

describe('AuthRepository (unit)', () => {
  const mockPrismaService: any = {
    user: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('createUser should create user and return normalized createdAt string', async () => {
    const now = new Date();
    const createdRow = { id: '1', email: 'a@b.com', clerkId: 'clerk_1', role: 'USER', createdAt: now };
    mockPrismaService.user.create.mockResolvedValue(createdRow);

    const repo = new AuthRepository(mockPrismaService);
    const result = await repo.createUser({ clerkId: 'clerk_1', email: 'a@b.com', password: 'x', confirmPassword: 'x' } as any);

    expect(mockPrismaService.user.create).toHaveBeenCalled();
    expect(result.createdAt).toBeTruthy();
    expect(typeof result.createdAt).toBe('string');
    expect(result.email).toBe('a@b.com');
  });
});
