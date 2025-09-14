import { PrismaService } from '../../../common/prisma/prisma.service';

export class SessionsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: { userId: string; device?: string; lang?: string }) {
    return this.prisma.session.create({ data });
  }

  async findById(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async list({ skip = 0, take = 10 }: { skip?: number; take?: number }) {
    const [items, total] = await Promise.all([
      this.prisma.session.findMany({ skip, take, orderBy: { startedAt: 'desc' } }),
      this.prisma.session.count(),
    ]);
    return { items, total };
  }

  async remove(id: string) {
    return this.prisma.session.delete({ where: { id } });
  }
}
