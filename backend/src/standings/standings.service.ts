import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      include: {
        tips: { select: { points: true, pointsAwarded: true } },
      },
    });

    return users
      .map((user) => ({
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        totalPoints: user.tips.reduce((sum, t) => sum + t.points, 0),
        tipsCount: user.tips.length,
        awardedTips: user.tips.filter((t) => t.pointsAwarded).length,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}
