import { ApiProperty } from '@nestjs/swagger';

export class DetectionDto {
  @ApiProperty({ example: 'cl1n34bleid', description: 'Detection id' })
  id: string;

  @ApiProperty({ example: 'sess_123', description: 'Related session id' })
  sessionId: string;

  @ApiProperty({ example: null, description: 'Related transcript id (may be null)' })
  transcriptId: string | null;

  @ApiProperty({ example: 'OFFENSIVE', enum: ['CLEAN', 'OFFENSIVE', 'HATE'] })
  label: string;

  @ApiProperty({ example: 0.92, description: 'Confidence score (0..1)' })
  score: number;

  @ApiProperty({ example: 120, description: 'Start time in milliseconds' })
  startMs: number;

  @ApiProperty({ example: 800, description: 'End time in milliseconds' })
  endMs: number;

  @ApiProperty({ example: 'some bad words', description: 'Snippet from transcript' })
  snippet: string;

  @ApiProperty({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  severity: string;

  @ApiProperty({ example: new Date().toISOString(), description: 'Timestamp when detection was created' })
  createdAt: string;
}
