import setup, { teardown } from './e2e.setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
let Client: any;
try {
  // require at runtime so test suite doesn't fail if package not installed in some envs
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Client = require('socket.io-client').io;
} catch (err) {
  Client = null;
}
import { AppModule } from '../src/app.module';
import { ClerkGuard } from '../src/common/guards/clerk.guard';

describe('WS audio namespace smoke', () => {
  let app: INestApplication;
  let url: string | null = null;

  beforeAll(async () => {
    if (process.env.E2E_SKIP === '1') return;
    const setupRes = await setup();
    if (!setupRes || !setupRes.url) return;
    url = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ClerkGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    await teardown();
  });

  it('can connect to /audio namespace (smoke)', (done) => {
    if (!url) return done();

    const socket = Client(url + '/audio', { transports: ['websocket'], forceNew: true });
    socket.on('connect', () => {
      // connected successfully
      socket.close();
      done();
    });
    socket.on('connect_error', (err) => {
      done(err);
    });
  }, 20000);
});
