import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('VN Speech Guardian API')
    .setDescription('Speech-to-Text with toxicity detection for Vietnamese')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = './public/openapi.json';
  fs.mkdirSync('./public', { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log('Wrote', outPath);
  await app.close();
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
