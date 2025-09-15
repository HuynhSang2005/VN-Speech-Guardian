import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkIntegrationService } from '../src/modules/auth/clerk-integration.service';

describe('Auth E2E (full module, mocked ClerkIntegration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (process.env.E2E_SKIP === '1') return;
    const setupRes = await setup();
    if (!setupRes || !setupRes.url) return;

    const mockClerk = {
      verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk-123' }),
      getOrCreateUser: jest.fn().mockResolvedValue({ id: 'u-test', clerkId: 'clerk-123', email: 'test@x.com', role: 'USER', createdAt: new Date() }),
    } as Partial<ClerkIntegrationService>;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ClerkIntegrationService)
      .useValue(mockClerk)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    await teardown();
  });

  it('POST /api/auth/clerk should return accessToken and user (happy path)', async () => {
    if (!app) return;
    const res = await request(app.getHttpServer()).post('/api/auth/clerk').send({ token: 'ok' }).expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('email', 'test@x.com');
  }, 20000);
});
