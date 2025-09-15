import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty({ example: 's_123', description: 'Session id' })
  id: string;

  @ApiProperty({ example: 'u_123', description: 'User id owning this session' })
  userId: string;

  @ApiProperty({ example: 'web', required: false })
  device?: string;

  @ApiProperty({ example: 'vi' })
  lang: string;

  @ApiProperty({ example: '2025-09-15T00:00:00.000Z' })
  startedAt: string;

  @ApiProperty({ example: null, nullable: true })
  endedAt?: string | null;
}

// Response envelope DTOs to show { success, data } shapes in OpenAPI
export class SessionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SessionDto })
  data: SessionDto;
}

export class SessionListItemDto {
  @ApiProperty({ type: [SessionDto] })
  items: SessionDto[];

  @ApiProperty({ example: 0 })
  total: number;
}

export class SessionListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SessionListItemDto })
  data: SessionListItemDto;
}

export class SessionCreateResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SessionDto })
  data: SessionDto;
}
