import { ApiProperty } from '@nestjs/swagger';

export class StatsOverviewDto {
  @ApiProperty({ example: 10 })
  totalSessions: number;

  @ApiProperty({ example: 20 })
  totalDetections: number;

  @ApiProperty({ example: 30 })
  toxicPercent: number;
}

export class StatsOverviewResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: StatsOverviewDto })
  data: StatsOverviewDto;
}
