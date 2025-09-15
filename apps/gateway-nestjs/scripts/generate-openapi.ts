import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Tiny arg parser (no extra deps) supporting --out=path, --dry-run, --verbose
const argv = process.argv.slice(2).reduce<Record<string, string | boolean>>((acc, a) => {
  if (a.startsWith('--')) {
    const kv = a.slice(2).split('=');
    acc[kv[0]] = kv.length > 1 ? kv[1] : true;
  }
  return acc;
}, {} as Record<string, string | boolean>);

async function generate() {
  // If SKIP_DB is set, set an env var so PrismaService can skip connecting in its onModuleInit
  // (PrismaService currently always connects; SKIP_DB allows generator to run without DB)
  const skipDb = process.env.SKIP_DB === 'true' || process.env.SKIP_DB === '1';
  if (skipDb) {
    process.env.SKIP_DB = '1';
    if ((argv as any).verbose) console.log('SKIP_DB enabled: generator will attempt to boot AppModule without DB');
  }

  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('VN Speech Guardian API')
    .setDescription('Speech-to-Text with toxicity detection for Vietnamese')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Determine output path. Default: <packageRoot>/public/openapi.json
  const pkgRoot = path.resolve(__dirname, '..');
  const defaultPublic = path.join(pkgRoot, 'public');
  const defaultOut = path.join(defaultPublic, 'openapi.json');

  let outPath = defaultOut;
  if (typeof argv.out === 'string' && (argv.out as string).length > 0) {
    const candidate = argv.out as string;
    outPath = path.isAbsolute(candidate) ? candidate : path.join(pkgRoot, candidate);
  }

  const dryRun = !!argv['dry-run'] || !!argv.dryrun || !!argv.dry;
  const verbose = !!argv.verbose || !!argv.v;

  if (verbose) console.log('Generator config:', { pkgRoot, defaultOut, outPath, dryRun });

  if (dryRun) {
    console.log('Dry run enabled — would write to', outPath);
  } else {
    const publicDir = path.dirname(outPath);
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(document, null, 2));
    console.log('Wrote', outPath);
  }
  await app.close();
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
