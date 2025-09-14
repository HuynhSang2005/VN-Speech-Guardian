/**
 * Mục đích: REST endpoint cho auth - verify Clerk token và sync user
 * Input:  POST /api/auth/clerk với { token } hoặc Authorization header
 * Output: { success: true, data: { user } } - không cần internal token
 * Edge:   invalid token → 401 với error message
 * Research: https://docs.nestjs.com/controllers#request-object
 */

import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClerkIntegrationService } from './clerk-integration.service';
import { AuthService } from './auth.service';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { LoginRequest, UserDto } from './dto/auth.dto';

type AuthResponse = { success: boolean; data: { user: UserDto } };

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private clerkIntegration: ClerkIntegrationService,
    private authService: AuthService,
  ) {}

  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify Clerk token and sync user to database',
    description: 'Send Clerk JWT either in request body or Authorization header. User will be created/synced in database.'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully verified token and synced user',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                clerkId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired Clerk token' })
  async verifyClerkToken(
    @Body() body: Partial<LoginRequest>,
    @Request() req: any,
  ): Promise<AuthResponse> {
    try {
      // VI: lấy token từ body hoặc Authorization header
  let token = body.token;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        throw new HttpException(
          {
            success: false,
            error: { code: 'VSG-001', message: 'Clerk token is required' },
          },
          400,
        );
      }

      // Delegate to AuthService which returns internal token + user
      const result = await this.authService.exchangeClerkToken(token);
      this.logger.log(`Clerk token exchanged for user: ${result.data.user.email}`);
      return { success: true, data: { accessToken: result.data.accessToken, user: result.data.user } } as any;
    } catch (error) {
      this.logger.error(`Auth verification failed: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: { code: 'VSG-003', message: 'Token verification failed' },
        },
        401,
      );
    }
  }

  @Get('me')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user info',
    description: 'Returns current authenticated user information'
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
  })
  async getCurrentUser(@Request() req: any): Promise<AuthResponse> {
    return {
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          clerkId: req.user.clerkId,
        },
      },
    };
  }
}