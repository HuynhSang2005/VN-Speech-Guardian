import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiTags, ApiResponse, ApiOkResponse, ApiExtraModels } from '@nestjs/swagger';
import { StatsOverviewDto, StatsOverviewResponseDto } from './dto/stats.dto';

@ApiTags('Stats')
@ApiExtraModels(StatsOverviewDto, StatsOverviewResponseDto)
@Controller('api/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  @ApiOkResponse({ description: 'Overview stats', type: StatsOverviewResponseDto })
  async overview() {
    const data = await this.statsService.overview();
    return { success: true, data };
  }
}
