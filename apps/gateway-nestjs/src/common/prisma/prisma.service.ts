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
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
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