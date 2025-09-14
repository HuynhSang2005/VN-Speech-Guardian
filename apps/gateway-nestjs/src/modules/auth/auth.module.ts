/**
 * Mục đích: module auth với JWT, Prisma, Clerk integration
 * Input:  AuthController, AuthService
 * Output: configured module với dependencies
 * Edge:   JWT secret missing → fallback dev key với warning
 */

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkIntegrationService } from './clerk-integration.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, ClerkIntegrationService],
  exports: [AuthService, ClerkIntegrationService],
})
export class AuthModule {}