import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.match.findMany({ orderBy: { matchDate: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.match.findUnique({ where: { id } });
  }

  findUpcoming() {
    return this.prisma.match.findMany({
      where: { status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] } },
      orderBy: { matchDate: 'asc' },
    });
  }

  async upsertFromApi(data: {
    externalId: number;
    matchDate: Date;
    teamHome: string;
    teamAway: string;
    teamHomeLogo?: string;
    teamAwayLogo?: string;
    scoreHome?: number | null;
    scoreAway?: number | null;
    status: MatchStatus;
    stage: string;
    group?: string | null;
  }) {
    return this.prisma.match.upsert({
      where: { externalId: data.externalId },
      update: {
        scoreHome: data.scoreHome,
        scoreAway: data.scoreAway,
        status: data.status,
        teamHomeLogo: data.teamHomeLogo,
        teamAwayLogo: data.teamAwayLogo,
      },
      create: data,
    });
  }
}
