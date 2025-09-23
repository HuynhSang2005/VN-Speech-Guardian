/**
 * Authentication API schemas cho VN Speech Guardian Frontend
 * Mirror backend auth.model.ts schemas để maintain consistency
 */

import { z } from 'zod';
import { CommonPatterns } from '../../lib/validation';

// =============================================================================
// Base User Schema - Mirror Backend UserSchema
// =============================================================================

export const UserSchema = z.object({
  id: z.string().optional(),
  clerkId: z.string().optional(),
  email: CommonPatterns.email,
  name: z.string().min(1, 'Name is required').max(100).optional(),
  phoneNumber: CommonPatterns.phoneNumberVN.optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']).default('USER').optional(),
  createdAt: z.string().datetime('Invalid creation date').optional(),
  updatedAt: z.string().datetime('Invalid update date').optional(),
});

// =============================================================================
// API Request Schemas
// =============================================================================

// Register Request Schema - Mirror backend RegisterBodySchema
export const RegisterRequestSchema = UserSchema.pick({
  email: true,
  name: true,
  phoneNumber: true,
}).extend({
  password: CommonPatterns.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).strict().superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Mật khẩu xác nhận không khớp',
      path: ['confirmPassword'],
    });
  }
});

// Login Request Schema - Mirror backend LoginBodySchema  
export const LoginRequestSchema = UserSchema.pick({
  email: true,
}).extend({
  password: z.string().min(1, 'Password is required'),
}).strict();

// Clerk Authentication Request (for frontend-specific auth)
export const ClerkAuthRequestSchema = z.object({
  token: z.string().min(1, 'Authentication token is required'),
  sessionId: z.string().optional(),
}).strict();

// Send OTP Request Schema - Mirror backend SendOTPBodySchema
export const SendOTPRequestSchema = z.object({
  email: CommonPatterns.email,
  type: z.enum(['OTP', 'RESET']).default('OTP'),
}).strict();

// Verify OTP Request Schema
export const VerifyOTPRequestSchema = z.object({
  email: CommonPatterns.email,
  code: z.string().length(6, 'OTP code must be 6 digits'),
  type: z.enum(['OTP', 'RESET']).default('OTP'),
}).strict();

// Update Profile Request Schema - Mirror backend UserUpdateSchema
export const UpdateProfileRequestSchema = UserSchema.pick({
  name: true,
  phoneNumber: true,
  avatar: true,
}).partial().strict();

// =============================================================================
// API Response Schemas
// =============================================================================

// Standard API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema,
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

// User Response Schema - Mirror backend RegisterResponseSchema
export const UserResponseSchema = UserSchema.omit({
  // Remove sensitive fields
}).extend({
  // Transform dates to strings for API response
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Register Response Schema
export const RegisterResponseSchema = ApiResponseSchema(UserResponseSchema);

// Login Response Schema - Mirror backend LoginResponseSchema
export const LoginResponseSchema = ApiResponseSchema(z.object({
  user: UserResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
}));

// Clerk Auth Response Schema (after token verification)
export const ClerkAuthResponseSchema = ApiResponseSchema(z.object({
  user: UserResponseSchema,
  session: z.object({
    id: z.string(),
    clerkSessionId: z.string(),
    expiresAt: z.string().datetime(),
  }),
}));

// Profile Response Schema
export const ProfileResponseSchema = ApiResponseSchema(UserResponseSchema);

// OTP Response Schema
export const SendOTPResponseSchema = ApiResponseSchema(z.object({
  message: z.string(),
  expiresAt: z.string().datetime(),
}));

export const VerifyOTPResponseSchema = ApiResponseSchema(z.object({
  verified: z.boolean(),
  token: z.string().optional(), // JWT token if verification successful
}));

// =============================================================================
// Clerk Integration Schemas (Frontend-specific)
// =============================================================================

// Clerk User Object Schema (from Clerk SDK)
export const ClerkUserSchema = z.object({
  id: z.string(),
  emailAddresses: z.array(z.object({
    id: z.string(),
    emailAddress: z.string().email(),
    verification: z.object({
      status: z.string(),
      strategy: z.string(),
    }).optional(),
  })),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  publicMetadata: z.record(z.any()).optional(),
  privateMetadata: z.record(z.any()).optional(),
  createdAt: z.number(), // Clerk uses timestamps
  updatedAt: z.number(),
});

// Clerk Session Schema
export const ClerkSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'ended', 'expired', 'removed']),
  expireAt: z.number(),
  abandonAt: z.number(),
  user: ClerkUserSchema,
});

// =============================================================================
// Type Exports - Consistent với Backend Naming
// =============================================================================

export type TUser = z.infer<typeof UserSchema>;
export type TRegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type TLoginRequest = z.infer<typeof LoginRequestSchema>;
export type TClerkAuthRequest = z.infer<typeof ClerkAuthRequestSchema>;
export type TSendOTPRequest = z.infer<typeof SendOTPRequestSchema>;
export type TVerifyOTPRequest = z.infer<typeof VerifyOTPRequestSchema>;
export type TUpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type TUserResponse = z.infer<typeof UserResponseSchema>;
export type TRegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type TLoginResponse = z.infer<typeof LoginResponseSchema>;
export type TClerkAuthResponse = z.infer<typeof ClerkAuthResponseSchema>;
export type TProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type TSendOTPResponse = z.infer<typeof SendOTPResponseSchema>;
export type TVerifyOTPResponse = z.infer<typeof VerifyOTPResponseSchema>;

export type TClerkUser = z.infer<typeof ClerkUserSchema>;
export type TClerkSession = z.infer<typeof ClerkSessionSchema>;

// =============================================================================
// Validation Helpers for Auth Context
// =============================================================================

/**
 * Transform Clerk user object to our User format
 */
export function transformClerkUser(clerkUser: TClerkUser): Partial<TUser> {
  const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
  const fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
  
  const result: Partial<TUser> = {
    clerkId: clerkUser.id,
    // Map public metadata to our user fields if needed
    role: (clerkUser.publicMetadata?.role as 'USER' | 'ADMIN' | 'MODERATOR') || 'USER',
  };
  
  // Only include fields that have valid values
  if (primaryEmail) {
    result.email = primaryEmail;
  }
  
  if (fullName) {
    result.name = fullName;
  }
  
  if (clerkUser.imageUrl) {
    result.avatar = clerkUser.imageUrl;
  }
  
  return result;
}

/**
 * Validate if user has required permissions
 */
export function hasPermission(
  user: TUser | TUserResponse, 
  requiredRole: 'USER' | 'ADMIN' | 'MODERATOR' = 'USER'
): boolean {
  const roleHierarchy = { USER: 0, MODERATOR: 1, ADMIN: 2 };
  const userRoleLevel = roleHierarchy[user.role || 'USER'];
  const requiredRoleLevel = roleHierarchy[requiredRole];
  
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if user profile is complete (has required fields)
 */
export function isProfileComplete(user: TUser | TUserResponse): boolean {
  return !!(user.email && user.name);
}

// =============================================================================
// Constants for Auth Context
// =============================================================================

export const AUTH_ERRORS = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
} as const;

export const AUTH_REDIRECT_PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  COMPLETE_PROFILE: '/profile/complete',
  VERIFY_EMAIL: '/auth/verify-email',
} as const;