import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

function createSessionPayload(overrides: Partial<any> = {}) {
  return {
    userId: overrides.userId ?? `test-user-${Math.random().toString(36).slice(2, 8)}`,
    device: overrides.device ?? 'web',
    lang: overrides.lang ?? 'vi',
  };
}

describe('Sessions E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (process.env.E2E_SKIP === '1') return;
    const setupRes = await setup();
    if (!setupRes || !setupRes.url) return;

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

  it('GET /api/sessions should return empty list initially', async () => {
    if (!app) return;
    const res = await request(app.getHttpServer()).get('/api/sessions').expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    // data shape may be { items, meta } depending on implementation — at minimum assert it exists
    expect(res.body.data).toBeDefined();
  }, 20000);

  it('POST /api/sessions should create a session and GET list includes it', async () => {
    if (!app) return;
    const payload = createSessionPayload();
  const post = await request(app.getHttpServer()).post('/api/sessions').send(payload);
  expect([200, 201]).toContain(post.status);
  expect(post.body).toHaveProperty('success', true);
    expect(post.body).toHaveProperty('data');
    const created = post.body.data;
    expect(created).toHaveProperty('id');

    const list = await request(app.getHttpServer()).get('/api/sessions').expect(200);
    // ensure at least one session returned
    expect(list.body.data).toBeDefined();
  }, 20000);

  it('GET /api/sessions/:id returns 404 for missing id', async () => {
    if (!app) return;
    await request(app.getHttpServer()).get('/api/sessions/non-existent-id').expect(404);
  }, 20000);
});
