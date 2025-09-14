import { Controller, Post, Body, Get, Query, Param, Delete, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, ListSessionsQueryDto } from './dto/sessions.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Sessions')
@Controller('api/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(@Body() body: CreateSessionDto) {
    return { success: true, data: await this.sessionsService.create(body as any) };
  }

  @Get()
  async list(
    @Query() q: ListSessionsQueryDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    const result = await this.sessionsService.list(page, perPage);
    return { success: true, data: result };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const s = await this.sessionsService.get(id);
    return { success: true, data: s };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.sessionsService.remove(id);
    return { success: true };
  }
}
