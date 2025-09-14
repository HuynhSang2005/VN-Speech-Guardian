import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Global()
@Module({
  imports: [],
  providers: [PrismaService, LoggingInterceptor],
  exports: [PrismaService, LoggingInterceptor],
})
export class CommonModule {}
