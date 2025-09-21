import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StatsModule } from './modules/stats/stats.module';
import { CommonModule } from './common/common.module';
import { RealTimeModule } from './modules/real-time/real-time.module';
import { AiWorkerModule } from './modules/ai-worker/ai-worker.module';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { HealthController } from './modules/health/health.controller';
import { MetricsController } from './modules/metrics/metrics.controller';

@Module({
  imports: [
    // config module để load env variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // JWT module global
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    // Pino logger cho structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    // Basic rate limiting for MVP: configurable via env.
    // To disable throttling for tests/CI set DISABLE_THROTTLER=1.
    // Note: Throttler v6 expects the array form; ttl is in milliseconds.
    ThrottlerModule.forRoot([
      {
        ttl:
          Number(process.env.THROTTLE_TTL || 60) * 1000 /* interpret env as seconds */,
        limit:
          process.env.DISABLE_THROTTLER === '1'
            ? Number(process.env.THROTTLE_LIMIT || 1000000)
            : Number(process.env.THROTTLE_LIMIT || 60),
      },
    ]),
  CommonModule,
  AuthModule,
  SessionsModule,
  StatsModule,
  RealTimeModule,
  AiWorkerModule,
  InfrastructureModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    // Register ThrottlerGuard as a global guard via APP_GUARD token
    // Can be disabled in CI/local runs by setting DISABLE_THROTTLER=1
    ...(process.env.DISABLE_THROTTLER === '1'
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
})
export class AppModule {}


