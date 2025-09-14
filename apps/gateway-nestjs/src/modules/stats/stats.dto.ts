import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const StatsOverviewSchema = z.object({
  sessions: z.number(),
  minutes: z.number(),
  toxicPercent: z.number(),
});

export class StatsOverviewDto extends createZodDto(StatsOverviewSchema) {}
