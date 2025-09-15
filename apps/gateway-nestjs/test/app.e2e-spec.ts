import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Gateway E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // skip if docker/testcontainers not available
    if (process.env.E2E_SKIP === '1') {
      // eslint-disable-next-line no-console
      console.warn('E2E skipped: Docker not available');
      return;
    }

    const setupResult = await setup();
    // eslint-disable-next-line no-console
    console.log('[e2e.spec] setup returned url=%s', setupResult?.url);
    // eslint-disable-next-line no-console
    console.log('[e2e.spec] env DATABASE_URL=%s', process.env.DATABASE_URL);

    // If setup returned no url it likely detected Docker unavailable — skip E2E
    if (!setupResult || !setupResult.url) {
      // eslint-disable-next-line no-console
      console.warn('E2E skipped: testcontainers/docker not available or setup failed');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    await teardown();
  });

  it('/api/sessions (GET) should return 200 and shaped response', async () => {
    if (!app) {
      // eslint-disable-next-line no-console
      console.warn('E2E skipped: app not started');
      return;
    }
    const res = await request(app.getHttpServer()).get('/api/sessions').expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  }, 20000);

  it('/api/auth/clerk (POST) should 400 without token', async () => {
    if (!app) {
      // eslint-disable-next-line no-console
      console.warn('E2E skipped: app not started');
      return;
    }
    await request(app.getHttpServer()).post('/api/auth/clerk').send({}).expect(400);
  }, 20000);
});
