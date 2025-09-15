// Auto-generated from E:\dev-my-project\VN-Speech-Guardian\apps\gateway-nestjs\src\modules\sessions\transcript.model.ts
import { createZodDto } from 'nestjs-zod';
import { TranscriptSchema } from '../transcript.model';
import { ApiProperty } from '@nestjs/swagger';

// Explicit Swagger wrapper so examples and descriptions appear in OpenAPI
export class TranscriptDto extends createZodDto(TranscriptSchema) {
	@ApiProperty({ example: 't_01', description: 'Transcript id' })
	id: string;

	@ApiProperty({ example: 's_01', description: 'Session id this transcript belongs to' })
	sessionId: string;

	@ApiProperty({ example: 0, description: 'Segment index (order within session)' })
	segIdx: number;

	@ApiProperty({ example: 'Xin chào', description: 'Recognized text for the segment' })
	text: string;

	@ApiProperty({ example: 0, description: 'Start time in milliseconds' })
	startMs: number;

	@ApiProperty({ example: 1200, description: 'End time in milliseconds' })
	endMs: number;
}

// Envelope DTOs for transcript list responses

export class TranscriptListItemDto {
	@ApiProperty({ type: [TranscriptDto] })
	items: TranscriptDto[];

	@ApiProperty({ example: 0 })
	total: number;
}

export class TranscriptListResponseDto {
	@ApiProperty({ example: true })
	success: boolean;

	@ApiProperty({ type: TranscriptListItemDto })
	data: TranscriptListItemDto;
}

