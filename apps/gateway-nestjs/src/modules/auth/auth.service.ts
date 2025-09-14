/**
 * Mục đích: exchange Clerk JWT → internal JWT token với user info
 * Input:  Clerk JWT từ frontend
 * Output: internal access_token + user info
 * Edge:   Clerk token hết hạn → 401, user không tồn tại → tạo mới
 * Research: https://docs.nestjs.com/security/authentication#jwt-token
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClerkIntegrationService } from './clerk-integration.service';
import type { UserDto } from './dto/auth.dto';

export type LoginResponse = {
  success: boolean;
  data: {
    accessToken: string;
    user: UserDto;
  };
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private clerkIntegration: ClerkIntegrationService;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // ClerkIntegrationService will be injected by Nest — ensure module provides it
  }

  async exchangeClerkToken(clerkToken: string): Promise<LoginResponse> {
    try {
      // Delegate verification + sync to ClerkIntegrationService
      const sessionToken = await this.clerkIntegration.verifyToken(clerkToken);
      if (!sessionToken || !sessionToken.sub) throw new UnauthorizedException('Invalid Clerk session token');

      const user = await this.clerkIntegration.getOrCreateUser(sessionToken.sub);

      const payload = {
        sub: user.id,
        clerkId: user.clerkId,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return { success: true, data: { accessToken, user: user as unknown as UserDto } };
    } catch (error) {
      this.logger.error('Clerk token exchange failed:', error.message);
      throw new UnauthorizedException('Invalid or expired Clerk token');
    }
  }

  private determineUserRole(clerkUser: any): 'USER' | 'ADMIN' {
    // VI: logic xác định role từ Clerk metadata
    const metadata = clerkUser.publicMetadata as any;
    return metadata?.role === 'ADMIN' ? 'ADMIN' : 'USER';
  }
}