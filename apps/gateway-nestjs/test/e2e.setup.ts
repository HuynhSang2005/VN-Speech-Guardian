import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import net from 'net';

let container: StartedPostgreSqlContainer | null = null;

export default async function setup() {
  // quick runtime check: if docker CLI is not available, bail early and let tests skip
  try {
    execSync('docker version', { stdio: 'ignore' });
  } catch (err) {
    // indicate to tests that docker is not available
    process.env.E2E_SKIP = '1';
    return { container: null, url: null };
  }
  const created = await new PostgreSqlContainer('postgres:15-alpine')
    .withUsername('test')
    .withPassword('test')
    .withDatabase('testdb')
    .start();

  container = created;

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const url = `postgresql://test:test@${host}:${port}/testdb?schema=public`;

  process.env.DATABASE_URL = url;
  // log location so debug output shows where tests try to connect
  // eslint-disable-next-line no-console
  console.log('[e2e.setup] Postgres host=%s port=%s url=%s', host, port, url);

  // wait for Postgres to be ready (simple TCP check with more retries)
  const maxAttempts = 60; // ~30s total at 500ms backoff
  let attempt = 0;
  let tcpOk = false;
  while (attempt < maxAttempts) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
      });
      tcpOk = true;
      break;
    } catch (err) {
      attempt++;
      // eslint-disable-next-line no-console
      console.log('[e2e.setup] waiting for tcp... attempt %d/%d', attempt, maxAttempts);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!tcpOk) {
    // eslint-disable-next-line no-console
    console.warn('[e2e.setup] Postgres TCP did not become ready after %d attempts', maxAttempts);
  }

  // run prisma migrate to create schema (use deploy for CI friendliness)
  // run migrate with retries as migrations may fail briefly while DB finalizes
  const migrateCmd = 'npx prisma migrate deploy';
  const migrateMaxAttempts = 6;
  for (let m = 1; m <= migrateMaxAttempts; m++) {
    try {
      // eslint-disable-next-line no-console
      console.log('[e2e.setup] running migrations (attempt %d/%d)', m, migrateMaxAttempts);
      execSync(migrateCmd, { stdio: 'inherit' });
      break;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[e2e.setup] migrate attempt %d failed: %s', m, (err as Error).message);
      if (m === migrateMaxAttempts) throw err;
      // backoff a bit
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000 * m));
    }
  }

  return { container, url };
}

export async function teardown() {
  if (container) await container.stop();
}

export function isDockerAvailable() {
  try {
    execSync('docker version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}
