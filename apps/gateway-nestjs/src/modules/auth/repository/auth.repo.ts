import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { PrismaClient } from '@prisma/client';
import { RegisterBodyType, RegisterResponseType } from '../auth.model';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(
    userData: Omit<RegisterBodyType, 'confirmPassword'> & { roleId?: string },
  ): Promise<RegisterResponseType> {
    const user = await this.prismaService.user.create({
      data: userData as any,
      select: {
        id: true,
        email: true,
        // adjust fields to match our User model
        clerkId: true,
        role: true,
        createdAt: true,
      },
    });

    const result = {
      ...user,
      createdAt: user.createdAt?.toISOString(),
    } as unknown as RegisterResponseType;

    if (!result.id || !result.email) {
      throw new Error('Invalid user data created');
    }

    return result;
  }
  // ...existing code...

}
