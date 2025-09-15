import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('Transcripts E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient | null = null;

  beforeAll(async () => {
    if (process.env.E2E_SKIP === '1') return;
    const setupRes = await setup();
    if (!setupRes || !setupRes.url) return;

    // connect prisma client to same DATABASE_URL so tests can seed transcripts
    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } } as any);
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
    await teardown();
  });

  it('GET /api/sessions/:id/transcripts returns transcripts after seeding', async () => {
    if (!app || !prisma) return;

    // create session via API
    const payload = { userId: `seed-${Date.now()}` };
    const post = await request(app.getHttpServer()).post('/api/sessions').send(payload);
    expect([200, 201]).toContain(post.status);
    const session = post.body.data;

    // seed two transcripts directly
    await prisma.transcript.createMany({
      data: [
        { sessionId: session.id, segIdx: 0, text: 'hello', startMs: 0, endMs: 500, words: JSON.stringify([]) },
        { sessionId: session.id, segIdx: 1, text: 'world', startMs: 500, endMs: 1000, words: JSON.stringify([]) },
      ],
    });

    const res = await request(app.getHttpServer()).get(`/api/sessions/${session.id}/transcripts`).expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const first = res.body.data[0];
    expect(first).toHaveProperty('text');
    expect(first).toHaveProperty('segIdx');
  }, 20000);
});
