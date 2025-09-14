import { createZodDto } from 'nestjs-zod';
import { RegisterBodySchema, RegisterResponseSchema, SendOTPBodySchema } from '../auth.model';

export class RegisterResponseDto extends createZodDto(RegisterResponseSchema) {}
export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}
export class SendOTPBodyDTO extends createZodDto(SendOTPBodySchema) {}

export type RegisterBodyType = ReturnType<typeof RegisterBodySchema.parse>;
export type RegisterResponseType = ReturnType<typeof RegisterResponseSchema.parse>;
export type SendOTPBodyType = ReturnType<typeof SendOTPBodySchema.parse>;

// Helpers for older imports
export type UserDto = ReturnType<typeof RegisterResponseSchema.parse>;
export type LoginRequest = { token?: string };
