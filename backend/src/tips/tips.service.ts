import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TipsService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.tip.findMany({
      where: { userId },
      include: { match: true },
      orderBy: { match: { matchDate: 'asc' } },
    });
  }

  findByMatch(matchId: string) {
    return this.prisma.tip.findMany({
      where: { matchId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
  }

  async upsert(userId: string, matchId: string, predictedHome: number, predictedAway: number) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException('Match has already started or is finished');
    }
    const deadline = new Date(match.matchDate.getTime() - 10 * 60 * 1000);
    if (new Date() >= deadline) {
      throw new BadRequestException('Tipp-Deadline: 10 Minuten vor Spielstart');
    }

    return this.prisma.tip.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: { predictedHome, predictedAway },
      create: { userId, matchId, predictedHome, predictedAway },
    });
  }

  async calculatePoints(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (
      !match ||
      match.status !== MatchStatus.FINISHED ||
      match.scoreHome === null ||
      match.scoreAway === null
    ) {
      return;
    }

    const tips = await this.prisma.tip.findMany({ where: { matchId, pointsAwarded: false } });
    for (const tip of tips) {
      const points = this.computePoints(
        tip.predictedHome,
        tip.predictedAway,
        match.scoreHome,
        match.scoreAway,
      );
      await this.prisma.tip.update({
        where: { id: tip.id },
        data: { points, pointsAwarded: true },
      });
    }
  }

  private computePoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
    if (predHome === actualHome && predAway === actualAway) return 3;
    if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return 1;
    return 0;
  }
}
