import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    // total sessions
    const sessions = await this.prisma.session.count();

    // total minutes: sum of (endedAt - startedAt) in minutes; if endedAt is null, count 0
    const raw = await this.prisma.$queryRawUnsafe<[{ total_ms: number | null }]>(
      `SELECT SUM(EXTRACT(EPOCH FROM (COALESCE("endedAt", NOW()) - "startedAt")) * 1000) as total_ms FROM "Session"`,
    );

    const totalMs = raw?.[0]?.total_ms ?? 0;
    const minutes = Math.round((totalMs / 1000 / 60) * 100) / 100; // 2 decimal

    // toxic percent: detections with label OFFENSIVE or HATE
    const totalDet = await this.prisma.detection.count();
    const toxicDet = await this.prisma.detection.count({ where: { label: { in: ['OFFENSIVE', 'HATE'] } } });
    const toxicPercent = totalDet === 0 ? 0 : Math.round((toxicDet / totalDet) * 10000) / 100; // percent with 2 decimals

    return { sessions, minutes, toxicPercent };
  }
}
