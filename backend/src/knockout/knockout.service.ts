import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

const STAGE_LABELS: Record<string, string> = {
  LAST_32:       'Sechzehntelfinale',
  LAST_16:       'Achtelfinale',
  QUARTER_FINALS:'Viertelfinale',
  SEMI_FINALS:   'Halbfinale',
  THIRD_PLACE:   'Spiel um Platz 3',
  FINAL:         'Finale',
};

export interface KnockoutMatch {
  id: string;
  externalId: number | null;
  matchDate: Date;
  teamHome: string;
  teamAway: string;
  teamHomeLogo: string | null;
  teamAwayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: MatchStatus;
}

export interface KnockoutStage {
  stage: string;
  label: string;
  matches: KnockoutMatch[];
}

@Injectable()
export class KnockoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getKnockoutStages(): Promise<KnockoutStage[]> {
    const matches = await this.prisma.match.findMany({
      where: { stage: { in: STAGE_ORDER } },
      orderBy: { matchDate: 'asc' },
    });

    const grouped: Record<string, KnockoutMatch[]> = {};
    for (const m of matches) {
      if (!grouped[m.stage]) grouped[m.stage] = [];
      grouped[m.stage].push({
        id:           m.id,
        externalId:   m.externalId,
        matchDate:    m.matchDate,
        teamHome:     m.teamHome,
        teamAway:     m.teamAway,
        teamHomeLogo: m.teamHomeLogo,
        teamAwayLogo: m.teamAwayLogo,
        scoreHome:    m.scoreHome,
        scoreAway:    m.scoreAway,
        status:       m.status,
      });
    }

    return STAGE_ORDER
      .filter((s) => grouped[s]?.length)
      .map((s) => ({
        stage:   s,
        label:   STAGE_LABELS[s],
        matches: grouped[s],
      }));
  }
}
