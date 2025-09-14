import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Stats')
@Controller('api/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  async overview() {
    const data = await this.statsService.overview();
    return { success: true, data };
  }
}
