import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('Stats E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient | null = null;

  beforeAll(async () => {
    if (process.env.E2E_SKIP === '1') return;
    const setupRes = await setup();
    if (!setupRes || !setupRes.url) return;

    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } } as any);
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
    await teardown();
  });

  it('GET /api/stats/overview should return sessions, minutes, toxicPercent', async () => {
    if (!app || !prisma) return;

    // seed a session and a detection
    const s = await prisma.session.create({ data: { userId: 'u1', device: 'web' } });
    await prisma.detection.create({ data: { sessionId: s.id, label: 'OFFENSIVE', score: 0.9, startMs: 0, endMs: 100, snippet: 'x', severity: 'HIGH' } });

    const res = await request(app.getHttpServer()).get('/api/stats/overview').expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('sessions');
    expect(res.body.data).toHaveProperty('minutes');
    expect(res.body.data).toHaveProperty('toxicPercent');
    expect(typeof res.body.data.sessions).toBe('number');
  }, 20000);
});
