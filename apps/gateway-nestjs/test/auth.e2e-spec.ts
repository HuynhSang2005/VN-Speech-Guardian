import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { ClerkIntegrationService } from '../src/modules/auth/clerk-integration.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';

describe('Auth (e2e) smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockAuthService = {
      exchangeClerkToken: jest.fn().mockResolvedValue({
        success: true,
        data: {
          accessToken: 'test-token',
          user: { id: 'u1', clerkId: 'c1', email: 'a@b.com', role: 'USER', createdAt: new Date().toISOString() },
        },
      }),
    } as Partial<AuthService>;

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ClerkIntegrationService, useValue: {} },
      ],
    });

    const moduleFixture: TestingModule = await moduleBuilder
      .overrideGuard(ClerkGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/clerk (POST) should return accessToken and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/clerk')
      .send({ token: 'dummy' })
      .expect(HttpStatus.OK);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accessToken', 'test-token');
    expect(res.body.data.user).toHaveProperty('email', 'a@b.com');
  });
});
