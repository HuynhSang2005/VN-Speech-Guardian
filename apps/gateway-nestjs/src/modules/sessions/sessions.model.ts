import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  device: z.string().optional(),
  lang: z.string().default('vi'),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
});

export type SessionType = z.infer<typeof SessionSchema>;
