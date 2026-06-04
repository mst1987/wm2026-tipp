import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamStats {
  team: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupMatchday {
  number: number;
  matches: GroupMatch[];
}

export interface GroupMatch {
  id: string;
  matchDate: Date;
  teamHome: string;
  teamAway: string;
  teamHomeLogo: string | null;
  teamAwayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: MatchStatus;
}

export interface GroupData {
  table: TeamStats[];
  matchdays: GroupMatchday[];
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroupTables(): Promise<Record<string, GroupData>> {
    const matches = await this.prisma.match.findMany({
      where: { group: { not: null } },
      orderBy: { matchDate: 'asc' },
    });

    const raw: Record<string, {
      teams: Record<string, TeamStats>;
      logos: Record<string, string | null>;
      matches: typeof matches;
    }> = {};

    for (const m of matches) {
      const group = (m.group ?? '').replace('GROUP_', '');
      if (!group) continue;

      if (!raw[group]) raw[group] = { teams: {}, logos: {}, matches: [] };
      raw[group].matches.push(m);

      // Logo aus Match-Daten extrahieren (erstes Vorkommen gewinnt)
      if (!raw[group].logos[m.teamHome]) raw[group].logos[m.teamHome] = m.teamHomeLogo;
      if (!raw[group].logos[m.teamAway]) raw[group].logos[m.teamAway] = m.teamAwayLogo;

      for (const team of [m.teamHome, m.teamAway]) {
        if (!raw[group].teams[team]) {
          raw[group].teams[team] = {
            team, logo: null,
            played: 0, won: 0, drawn: 0, lost: 0,
            goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
          };
        }
      }

      if ((m.status === MatchStatus.FINISHED || m.status === MatchStatus.LIVE) && m.scoreHome !== null && m.scoreAway !== null) {
        const h = raw[group].teams[m.teamHome];
        const a = raw[group].teams[m.teamAway];
        h.played++; h.goalsFor += m.scoreHome; h.goalsAgainst += m.scoreAway;
        a.played++; a.goalsFor += m.scoreAway; a.goalsAgainst += m.scoreHome;
        if (m.scoreHome > m.scoreAway)      { h.won++; a.lost++; }
        else if (m.scoreHome < m.scoreAway) { a.won++; h.lost++; }
        else                                 { h.drawn++; a.drawn++; }
      }
    }

    const result: Record<string, GroupData> = {};
    for (const [group, data] of Object.entries(raw)) {
      const table = Object.values(data.teams)
        .map(t => ({
          ...t,
          logo: data.logos[t.team] ?? null,
          goalDiff: t.goalsFor - t.goalsAgainst,
          points: t.won * 3 + t.drawn,
        }))
        .sort((a, b) =>
          b.points - a.points ||
          b.goalDiff - a.goalDiff ||
          b.goalsFor - a.goalsFor ||
          a.team.localeCompare(b.team),
        );

      const MATCHES_PER_DAY = 2;
      const matchdays: GroupMatchday[] = [];
      for (let i = 0; i < data.matches.length; i += MATCHES_PER_DAY) {
        matchdays.push({
          number: matchdays.length + 1,
          matches: data.matches.slice(i, i + MATCHES_PER_DAY).map((m) => ({
            id: m.id,
            matchDate: m.matchDate,
            teamHome: m.teamHome,
            teamAway: m.teamAway,
            teamHomeLogo: m.teamHomeLogo,
            teamAwayLogo: m.teamAwayLogo,
            scoreHome: m.scoreHome,
            scoreAway: m.scoreAway,
            status: m.status,
          })),
        });
      }

      result[group] = { table, matchdays };
    }

    return result;
  }
}
