/**
 * Bootstrap NestJS application: logging, CORS, validation, throttling and Swagger
 */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import * as client from 'prom-client';
import helmet from 'helmet';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { APP_FILTER } from '@nestjs/core';
import path from 'path';
import { validateApiKeyMiddleware } from './common/middleware/validate-api-key.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security hardening
  app.use(helmet());

  // CORS: allow list from env CORS_ORIGINS (comma-separated). If not set, default to localhost dev origins.
  const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173';
  const allowedOrigins = rawOrigins.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Prometheus default metrics
  client.collectDefaultMetrics();

  // Sentry init (optional)
  if (process.env.SENTRY_DSN) {
    let release = process.env.SENTRY_RELEASE;
    if (!release) {
      try {
        // Try to read package.json version
        // path.resolve works both in ts-node and compiled dist
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require(path.resolve(__dirname, '../../package.json'));
        release = pkg?.version;
      } catch (e) {
        // ignore
      }
    }
    Sentry.init({ dsn: process.env.SENTRY_DSN, release });
    // Register global exception filter
    app.useGlobalFilters(new SentryExceptionFilter());
  }

  // sử dụng Pino logger thay vì default logger
  app.useLogger(app.get(PinoLogger));

  // enable CORS cho frontend connection
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // React/Vite ports
    credentials: true,
  });

  // global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // ThrottlerGuard is registered globally in AppModule via APP_GUARD

  //  Swagger / OpenAPI documentation setup
  const config = new DocumentBuilder()
    .setTitle('VN Speech Guardian API')
    .setDescription('Speech-to-Text with toxicity detection for Vietnamese')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'Authorization')
    .setContact('VN Speech Team', 'https://example.com', 'team@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(process.env.API_HOST || `http://localhost:${process.env.PORT || 3001}`)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // include all controllers and models (default) — placeholder for extra options
  });

  // expose raw OpenAPI JSON for CI/consumers
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'VN Speech Guardian API Docs',
  });
  // also serve the raw JSON at a stable endpoint
  // Apply example API key validation middleware to all /api/* HTTP routes.
  // Note: WebSocket namespace (/audio) is unaffected by this middleware.
  app.use('/api', validateApiKeyMiddleware);
  app.use('/api/docs-json', (req, res) => res.json(document));

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Server ready at http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
