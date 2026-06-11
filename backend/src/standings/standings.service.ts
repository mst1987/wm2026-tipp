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

    const sorted = users
      .map((user) => ({
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        hasPaid: user.hasPaid,
        totalPoints: user.tips.reduce((sum, t) => sum + t.points, 0),
        tipsCount: user.tips.length,
        awardedTips: user.tips.filter((t) => t.pointsAwarded).length,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Ränge nur unter bezahlten Teilnehmern vergeben
    const ranked = sorted
      .filter((u) => u.hasPaid)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Unbezahlte ohne Rang, ebenfalls nach Punkten sortiert
    const unpaid = sorted
      .filter((u) => !u.hasPaid)
      .map((entry) => ({ ...entry, rank: 0 }));

    return { ranked, unpaid };
  }

  /**
   * Live-Rangliste: bereits vergebene Punkte (beendete Spiele) plus
   * provisorische Punkte aus aktuell laufenden Spielen anhand des Live-Stands.
   */
  async getLiveLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { hasPaid: true },
      include: {
        tips: {
          include: {
            match: { select: { id: true, status: true, scoreHome: true, scoreAway: true } },
          },
        },
      },
    });

    const liveMatchIds = new Set<string>();

    const entries = users.map((user) => {
      let basePoints = 0;
      let livePoints = 0;

      for (const tip of user.tips) {
        const m = tip.match;
        if (tip.pointsAwarded) {
          basePoints += tip.points;
        } else if (m.status === 'LIVE' && m.scoreHome !== null && m.scoreAway !== null) {
          liveMatchIds.add(m.id);
          livePoints += this.provisionalPoints(tip.predictedHome, tip.predictedAway, m.scoreHome, m.scoreAway);
        }
      }

      return {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        hasPaid: user.hasPaid,
        basePoints,
        livePoints,
        totalPoints: basePoints + livePoints,
      };
    });

    const ranked = entries
      .sort((a, b) => b.totalPoints - a.totalPoints || b.livePoints - a.livePoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return { hasLive: liveMatchIds.size > 0, entries: ranked };
  }

  /** 3 = exakt, 2 = richtige Tordifferenz, 1 = richtige Tendenz, sonst 0. */
  private provisionalPoints(ph: number, pa: number, ah: number, aa: number): number {
    if (ph === ah && pa === aa) return 3;
    if (ph - pa === ah - aa) return 2;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
  }
}
