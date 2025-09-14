import { number, z } from 'zod'
import { Prisma } from '@prisma/client'

// Define UserSchema used in this module (adapted to current Prisma User model)
export const UserSchema = z.object({
  id: z.string().optional(),
  clerkId: z.string().optional(),
  email: z.email(),
  name: z.string().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  avatar: z.string().optional(),
  role: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional(),
  totpSecret: z.string().optional(),
})

// Register Request Schema
export const RegisterBodySchema = UserSchema
  .pick({
    email: true,
    name: true,
    password: true,
    phoneNumber: true,
  })
  .extend({
    phoneNumber: z.string().min(9).max(15).optional(),
    confirmPassword: z.string().min(6).max(100),
  })
  .strict()
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
      })
    }
  })

export type RegisterBodyType = z.infer<typeof RegisterBodySchema>

// Register Response Schema - với proper types
export const RegisterResponseSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
}).extend({
  // Transform dates thành strings
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
})

export type RegisterResponseType = z.infer<typeof RegisterResponseSchema>

// User Public Schema - cho các API khác cần trả về user info
export const UserPublicSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
})

export type UserPublicType = z.infer<typeof UserPublicSchema>

// User Update Schema - cho update profile
export const UserUpdateSchema = UserSchema
  .pick({
    name: true,
    phoneNumber: true,
    avatar: true,
  })
  .partial() 

export type UserUpdateType = z.infer<typeof UserUpdateSchema>

// Login Request Schema
export const LoginBodySchema = UserSchema.pick({
  email: true,
  password: true,
})

export type LoginBodyType = z.infer<typeof LoginBodySchema>

// Login Response Schema
export const LoginResponseSchema = z.object({
  user: UserPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
})

export type LoginResponseType = z.infer<typeof LoginResponseSchema>

export const VerificationCode = z.object({
  id: number().positive(),
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(['OTP','RESET']),
  expiresAt: z.date(),
  createdAt: z.date(),
})

export type VerificationCodeType = z.infer<typeof VerificationCode>

export const SendOTPBodySchema = VerificationCode.pick({
  email: true,
  type: true,
}).strict()

export type SendOTPBodyType = z.infer<typeof SendOTPBodySchema>
