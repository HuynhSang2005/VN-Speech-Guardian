/**
 * import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // VI: cookie parser cho Clerk session cookies
  app.use(cookieParser());

  // VI: sử dụng Pino logger thay vì default logger
  app.useLogger(app.get(PinoLogger));ntrypoint NestJS app với Swagger, CORS, logging
 * Input:  AppModule
 * Output: HTTP server listening trên PORT
 * Edge:   port bận → auto increment hoặc error
 * Research: https://docs.nestjs.com/first-steps#setup
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  //  Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('VN Speech Guardian API')
    .setDescription('Speech-to-Text with toxicity detection for Vietnamese')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Server ready at http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
