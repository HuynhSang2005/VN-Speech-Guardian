// Auto-generated from E:\dev-my-project\VN-Speech-Guardian\apps\gateway-nestjs\src\modules\auth\auth.model.ts
import { createZodDto } from 'nestjs-zod';
import { UserSchema, RegisterBodySchema, RegisterResponseSchema, UserPublicSchema, UserUpdateSchema, LoginBodySchema, LoginResponseSchema, SendOTPBodySchema } from '../auth.model';

export class UserDto extends createZodDto(UserSchema) {}

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}

export class RegisterResponseDto extends createZodDto(RegisterResponseSchema) {}

export class UserPublicDto extends createZodDto(UserPublicSchema) {}

export class UserUpdateDto extends createZodDto(UserUpdateSchema) {}

export class LoginBodyDto extends createZodDto(LoginBodySchema) {}

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}

export class SendOTPBodyDto extends createZodDto(SendOTPBodySchema) {}

