import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Stats')
@Controller('api/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  @ApiResponse({ status: 200, description: 'Overview stats', schema: { example: { success: true, data: { totalSessions: 10, totalDetections: 20, toxicPercent: 30 } } } })
  async overview() {
    const data = await this.statsService.overview();
    return { success: true, data };
  }
}
