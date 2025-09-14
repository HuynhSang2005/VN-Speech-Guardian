import { createZodDto } from 'nestjs-zod';
import { TranscriptSchema } from '../transcript.model';

export class TranscriptDto extends createZodDto(TranscriptSchema) {}
