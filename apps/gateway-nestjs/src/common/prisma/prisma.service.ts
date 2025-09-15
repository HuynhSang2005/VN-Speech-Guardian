/**
 * Mục đích: cung cấp Prisma client service cho toàn app
 * Input:  DATABASE_URL từ env
 * Output: PrismaClient instance với connection pooling
 * Edge:   database connection fail → log error và retry
 * Research: https://docs.nestjs.com/recipes/prisma
 */

import { Injectable, OnModuleInit, Logger, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Allow generator/CI runs to skip DB connection by setting SKIP_DB=1
    if (process.env.SKIP_DB === '1' || process.env.SKIP_DB === 'true') {
      this.logger.log('SKIP_DB set — skipping Prisma connect (generator/CI mode)');
      return;
    }

  // Log recommended pool config (read from env) — don't modify PrismaClient ctor here.
  const poolMax = Number(process.env.PRISMA_POOL_MAX || process.env.PGPOOL_MAX || 10);
  const poolMin = Number(process.env.PRISMA_POOL_MIN || process.env.PGPOOL_MIN || 1);
  this.logger.log(`Prisma pool config: min=${poolMin}, max=${poolMax}`);

  // try connecting with retry to survive transient DB startup in containers
    const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES || 3);
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        break;
      } catch (error) {
        attempt += 1;
        this.logger.warn(`Prisma connect attempt ${attempt} failed: ${error}.`);
        if (attempt >= maxAttempts) {
          this.logger.error('Failed to connect to database after retries:', error);
          throw error;
        }
        // exponential backoff
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  // Hook để đóng app khi Prisma muốn exit (recommended by Prisma + Nest docs)
  enableShutdownHooks(app: INestApplication) {
    // cast to any because PrismaClient.$on typings are narrow in some versions
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Prisma disconnected');
    } catch (err) {
      this.logger.error('Error disconnecting Prisma:', err);
    }
  }
}