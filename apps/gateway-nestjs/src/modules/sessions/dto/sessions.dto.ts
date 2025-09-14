import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

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
