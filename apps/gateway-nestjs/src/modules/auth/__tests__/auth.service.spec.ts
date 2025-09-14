import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClerkIntegrationService } from '../clerk-integration.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockClerk: Partial<ClerkIntegrationService>;

  beforeEach(async () => {
    mockClerk = {
      verifyToken: jest.fn().mockResolvedValue({ sub: 'u1' }),
      getOrCreateUser: jest.fn().mockResolvedValue({ id: 'u1', clerkId: 'c1', email: 'a@b.com' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt') } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: PrismaService, useValue: {} },
        { provide: ClerkIntegrationService, useValue: mockClerk },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('exchangeClerkToken returns token and user', async () => {
    const res = await service.exchangeClerkToken('fake');
    expect(res.success).toBe(true);
    expect(res.data.accessToken).toBe('jwt');
  });
});
