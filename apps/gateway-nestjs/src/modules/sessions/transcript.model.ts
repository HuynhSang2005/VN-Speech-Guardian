import { z } from 'zod';

export const TranscriptSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  segIdx: z.number(),
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export type TranscriptType = z.infer<typeof TranscriptSchema>;
