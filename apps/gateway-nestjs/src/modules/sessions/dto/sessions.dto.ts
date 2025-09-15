import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateSessionSchema = z.object({
  userId: z.string(),
  device: z.string().optional(),
  lang: z.string().optional().default('vi'),
});

export const ListSessionsQuerySchema = z.object({
  page: z.string().optional(),
  perPage: z.string().optional(),
});

export class CreateSessionDto extends createZodDto(CreateSessionSchema) {}
export class ListSessionsQueryDto extends createZodDto(ListSessionsQuerySchema) {}

// A lightweight Swagger-only DTO used for clearer OpenAPI examples
export class CreateSessionSwaggerDto {
  @ApiProperty({ description: 'ID of the user starting the session', example: 'u_12345' })
  userId: string;

  @ApiProperty({ description: 'Client device where session originated', example: 'web', required: false })
  device?: string;

  @ApiProperty({ description: 'Language code (default vi)', example: 'vi', required: false })
  lang?: string;
}
