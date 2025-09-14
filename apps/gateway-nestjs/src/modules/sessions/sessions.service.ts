import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SessionsRepository } from './repository/sessions.repo';

@Injectable()
export class SessionsService {
  private repo: SessionsRepository;

  constructor(private prisma: PrismaService) {
    this.repo = new SessionsRepository(prisma);
  }

  async create(data: { userId: string; device?: string; lang?: string }) {
    const session = await this.repo.create(data);
    return { ...session, startedAt: session.startedAt?.toISOString() };
  }

  async get(id: string) {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException('Session not found');
    return { ...s, startedAt: s.startedAt?.toISOString() };
  }

  async list(page = 1, perPage = 10) {
    const skip = (page - 1) * perPage;
    const { items, total } = await this.repo.list({ skip, take: perPage });
    const shaped = items.map((i) => ({ ...i, startedAt: i.startedAt?.toISOString() }));
    return { items: shaped, total };
  }

  async remove(id: string) {
    return this.repo.remove(id);
  }
}
