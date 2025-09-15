import { Controller, Post, Body, Get, Query, Param, Delete, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, ListSessionsQueryDto, CreateSessionSwaggerDto } from './dto/sessions.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiOkResponse, ApiExtraModels, ApiCreatedResponse } from '@nestjs/swagger';
import { TranscriptDto } from './dto/transcript.model.dto';
import { DetectionDto } from '../detections/detection.dto';
import { SessionDto } from './dto/session.dto';
import { SessionResponseDto, SessionListResponseDto, SessionCreateResponseDto } from './dto/session.dto';
import { TranscriptListResponseDto } from './dto/transcript.model.dto';

@ApiTags('Sessions')
@Controller('api/sessions')
@ApiExtraModels(TranscriptDto, DetectionDto, SessionDto, SessionResponseDto, SessionListResponseDto, SessionCreateResponseDto, TranscriptListResponseDto)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiCreatedResponse({ description: 'Session created', type: SessionCreateResponseDto })
  async create(@Body() body: CreateSessionDto) {
    return { success: true, data: await this.sessionsService.create(body as any) };
  }

  @Get()
  @ApiOperation({ summary: 'List sessions (paged)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'perPage', required: false, description: 'Items per page', example: 10 })
  @ApiOkResponse({ type: SessionListResponseDto })
  async list(
    @Query() q: ListSessionsQueryDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    const result = await this.sessionsService.list(page, perPage);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session detail' })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiOkResponse({ description: 'Session object', type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async get(@Param('id') id: string) {
    const s = await this.sessionsService.get(id);
    return { success: true, data: s };
  }

  @Get(':id/transcripts')
  @ApiOperation({ summary: 'List transcripts for a session' })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiOkResponse({ description: 'Array of transcripts', type: TranscriptListResponseDto })
  async transcripts(@Param('id') id: string) {
    const t = await this.sessionsService.listTranscripts(id);
    return { success: true, data: { items: t, total: t.length } };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({ name: 'id', description: 'Session id' })
  async remove(@Param('id') id: string) {
    await this.sessionsService.remove(id);
    return { success: true };
  }
}
