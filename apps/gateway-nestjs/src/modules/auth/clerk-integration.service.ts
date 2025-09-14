/**
 * Mục đích: tích hợp Clerk với database local, đồng bộ user data
 * Input:  Clerk token hoặc user data
 * Output: user info từ DB với role/permissions
 * Edge:   Clerk user không sync → auto create, network error → retry
 * Research: https://clerk.com/docs/backend-requests/handling/nodejs
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createClerkClient, User as ClerkUser } from '@clerk/clerk-sdk-node';
import type { UserDto } from './dto/auth.dto';

@Injectable()
export class ClerkIntegrationService {
  private readonly logger = new Logger(ClerkIntegrationService.name);
  private clerkClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clerkClient = createClerkClient({
      secretKey: this.configService.get('CLERK_SECRET_KEY'),
    });
  }

  /**
   * verify Clerk token và trả về payload
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return await this.clerkClient.verifyToken(token, {
        jwtKey: this.configService.get('CLERK_JWT_KEY'),
      });
    } catch (error) {
      this.logger.error('Clerk token verification failed:', error.message);
      throw error;
    }
  }

  /**
   * lấy thông tin user từ Clerk và sync với DB
   */
  async getOrCreateUser(clerkUserId: string): Promise<UserDto> {
    try {
      // tìm user trong DB trước
      let dbUser = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (dbUser) {
        const result = {
          ...dbUser,
          createdAt: dbUser.createdAt?.toISOString(),
        } as unknown as UserDto;
        return result;
      }

      // nếu không có trong DB, lấy từ Clerk và tạo mới
      const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk');
      }

      // tạo user mới trong DB
      dbUser = await this.prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          role: this.determineUserRole(clerkUser),
        },
      });

      this.logger.log(`Created new user: ${dbUser.email} (${dbUser.clerkId})`);
      const result = {
        ...dbUser,
        createdAt: dbUser.createdAt?.toISOString(),
      } as unknown as UserDto;
      return result;
    } catch (error) {
      this.logger.error('Failed to get or create user:', error.message);
      throw error;
    }
  }

  /**
   * sync user data từ Clerk về DB (để update thông tin)
   */
  async syncUserData(clerkUserId: string): Promise<UserDto> {
    try {
      const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
      
      const updatedUser = await this.prisma.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          role: this.determineUserRole(clerkUser),
        },
      });
      this.logger.log(`Synced user data: ${updatedUser.email}`);
      const result = {
        ...updatedUser,
        createdAt: updatedUser.createdAt?.toISOString(),
      } as unknown as UserDto;
      return result;
    } catch (error) {
      this.logger.error('Failed to sync user data:', error.message);
      // fallback to get existing user
  return this.getOrCreateUser(clerkUserId);
    }
  }

  /**
   * xác định role từ Clerk metadata
   */
  private determineUserRole(clerkUser: ClerkUser): 'USER' | 'ADMIN' {
    const metadata = clerkUser.publicMetadata as any;
    
    // check admin role từ metadata
    if (metadata?.role === 'ADMIN' || metadata?.isAdmin === true) {
      return 'ADMIN';
    }

    // check admin email domain (ví dụ @company.com)
    const adminDomains = this.configService.get('ADMIN_EMAIL_DOMAINS')?.split(',') || [];
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
    
    if (adminDomains.some(domain => userEmail.endsWith(domain))) {
      return 'ADMIN';
    }

    return 'USER';
  }

  /**
   * kiểm tra user có permission không
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    // admin có tất cả permissions
    if (user.role === 'ADMIN') return true;

    // có thể mở rộng logic permission phức tạp hơn
    const userPermissions = ['sessions:read', 'sessions:create'];
    return userPermissions.includes(permission);
  }
}