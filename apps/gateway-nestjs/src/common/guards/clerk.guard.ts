/**
 * Mục đích: xác thực JWT từ Clerk, attach user info vào request
 * Input:  Bearer token trong Authorization header hoặc session cookie
 * Output: req.user với { userId, email, role } hoặc throw UnauthorizedException
 * Edge:   token hết hạn/không hợp lệ → 401, auto sync user data
 * Research: https://clerk.com/docs/backend-requests/handling/nodejs
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkIntegrationService } from '../../modules/auth/clerk-integration.service';
import type { UserDto } from '../../modules/auth/dto/auth.dto';
import { Request } from 'express';

export interface ClerkUser extends UserDto {
  // thêm fields khác nếu cần
}

declare global {
  namespace Express {
    interface Request {
      user?: ClerkUser;
    }
  }
}

@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);

  constructor(
    private configService: ConfigService,
    private clerkIntegration: ClerkIntegrationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No authorization token provided');
      throw new UnauthorizedException('Authorization token required');
    }

    try {
      // verify JWT token với Clerk
      const sessionToken = await this.clerkIntegration.verifyToken(token);

      if (!sessionToken || !sessionToken.sub) {
        throw new UnauthorizedException('Invalid session token');
      }

      // lấy hoặc tạo user trong DB
      const user = await this.clerkIntegration.getOrCreateUser(sessionToken.sub);

      // attach user info vào request
      request.user = {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      } as ClerkUser;

      this.logger.log(`User authenticated: ${request.user.email} (${request.user.role})`);
      return true;
    } catch (error) {
      this.logger.error('Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // support Bearer token
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    // support session cookie từ Clerk (fallback)
    const sessionCookie = request.cookies?.__session;
    if (sessionCookie) {
      return sessionCookie;
    }

    return undefined;
  }
}