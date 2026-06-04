import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GoalEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  player: string;
  assist: string | null;
  detail: string;       // "Normal Goal", "Penalty", "Own Goal"
  isOwnGoal: boolean;
  isPenalty: boolean;
}

export interface CardEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  player: string;
  card: 'yellow' | 'red';
}

export interface SubEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  playerIn: string;
  playerOut: string;
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
}

export interface TeamLineup {
  teamName: string;
  formation: string | null;
  coach: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchDetails {
  available: boolean;
  message?: string;
  venue?: string | null;
  referee?: string | null;
  status?: string;
  elapsed?: number | null;
  homeTeam?: { name: string; logo: string | null };
  awayTeam?: { name: string; logo: string | null };
  score?: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  goals?: GoalEvent[];
  cards?: CardEvent[];
  substitutions?: SubEvent[];
  lineups?: { home: TeamLineup | null; away: TeamLineup | null };
}

interface CacheEntry { data: MatchDetails; expires: number; }

@Injectable()
export class MatchDetailsService {
  private readonly logger = new Logger(MatchDetailsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  // Beendete Spiele 1h cachen, laufende/zukünftige nur 60s
  private readonly TTL_FINISHED = 60 * 60 * 1000;
  private readonly TTL_OTHER = 60 * 1000;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getDetails(matchId: string): Promise<MatchDetails> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Spiel nicht gefunden');

    const cached = this.cache.get(matchId);
    if (cached && cached.expires > Date.now()) return cached.data;

    const apiKey = this.config.get<string>('API_FOOTBALL_KEY');
    if (!apiKey || apiKey === 'your_api_football_key') {
      return { available: false, message: 'API-Football ist nicht konfiguriert (API_FOOTBALL_KEY fehlt).' };
    }

    try {
      // 1. Fixture-ID auflösen (und cachen)
      let fixtureId = match.apiFootballId;
      if (!fixtureId) {
        fixtureId = await this.resolveFixtureId(match.teamHome, match.teamAway, match.matchDate, apiKey);
        if (fixtureId) {
          await this.prisma.match.update({ where: { id: matchId }, data: { apiFootballId: fixtureId } });
        }
      }

      if (!fixtureId) {
        return { available: false, message: 'Für dieses Spiel wurden noch keine Detaildaten gefunden.' };
      }

      // 2. Detaildaten abrufen
      const details = await this.fetchFixture(fixtureId, apiKey);
      const ttl = details.status === 'FINISHED' ? this.TTL_FINISHED : this.TTL_OTHER;
      this.cache.set(matchId, { data: details, expires: Date.now() + ttl });
      return details;
    } catch (err: any) {
      this.logger.error(`Fehler beim Laden der Match-Details: ${err?.message}`);
      return { available: false, message: 'Detaildaten konnten nicht geladen werden.' };
    }
  }

  private headers(apiKey: string) {
    return { 'x-apisports-key': apiKey };
  }

  private baseUrl(): string {
    return this.config.get<string>('API_FOOTBALL_BASE_URL', 'https://v3.football.api-sports.io');
  }

  /** Sucht die API-Football Fixture-ID anhand von Datum + Teamnamen. */
  private async resolveFixtureId(
    teamHome: string,
    teamAway: string,
    matchDate: Date,
    apiKey: string,
  ): Promise<number | null> {
    const league = this.config.get<string>('API_FOOTBALL_LEAGUE', '1');
    const season = this.config.get<string>('API_FOOTBALL_SEASON', '2026');
    const dateStr = matchDate.toISOString().slice(0, 10);

    const { data } = await axios.get(`${this.baseUrl()}/fixtures`, {
      headers: this.headers(apiKey),
      params: { league, season, date: dateStr },
    });

    const fixtures: any[] = data?.response ?? [];
    const nh = this.norm(teamHome);
    const na = this.norm(teamAway);

    for (const f of fixtures) {
      const fh = this.norm(f.teams?.home?.name ?? '');
      const fa = this.norm(f.teams?.away?.name ?? '');
      if (this.teamsMatch(nh, fh) && this.teamsMatch(na, fa)) {
        return f.fixture?.id ?? null;
      }
    }
    return null;
  }

  private async fetchFixture(fixtureId: number, apiKey: string): Promise<MatchDetails> {
    const { data } = await axios.get(`${this.baseUrl()}/fixtures`, {
      headers: this.headers(apiKey),
      params: { id: fixtureId },
    });

    const f = data?.response?.[0];
    if (!f) return { available: false, message: 'Keine Detaildaten verfügbar.' };

    const homeId = f.teams?.home?.id;
    const sideOf = (teamId: number): 'home' | 'away' => (teamId === homeId ? 'home' : 'away');

    const goals: GoalEvent[] = [];
    const cards: CardEvent[] = [];
    const substitutions: SubEvent[] = [];

    for (const e of (f.events ?? []) as any[]) {
      const side = sideOf(e.team?.id);
      const minute = e.time?.elapsed ?? 0;
      const extra = e.time?.extra ?? null;

      if (e.type === 'Goal') {
        const detail = e.detail ?? 'Normal Goal';
        if (detail === 'Missed Penalty') continue; // verschossener Elfer = kein Tor
        goals.push({
          minute, extra, team: side,
          player: e.player?.name ?? 'Unbekannt',
          assist: e.assist?.name ?? null,
          detail,
          isOwnGoal: detail === 'Own Goal',
          isPenalty: detail === 'Penalty',
        });
      } else if (e.type === 'Card') {
        cards.push({
          minute, extra, team: side,
          player: e.player?.name ?? 'Unbekannt',
          card: (e.detail ?? '').includes('Red') ? 'red' : 'yellow',
        });
      } else if (e.type === 'subst') {
        substitutions.push({
          minute, extra, team: side,
          playerIn: e.assist?.name ?? '—',   // API-Football: assist = eingewechselt
          playerOut: e.player?.name ?? '—',  // player = ausgewechselt
        });
      }
    }

    const mapLineup = (l: any): TeamLineup | null => {
      if (!l) return null;
      const mapP = (p: any): LineupPlayer => ({
        name: p.player?.name ?? 'Unbekannt',
        number: p.player?.number ?? null,
        pos: p.player?.pos ?? null,
        grid: p.player?.grid ?? null,
      });
      return {
        teamName: l.team?.name ?? '',
        formation: l.formation ?? null,
        coach: l.coach?.name ?? null,
        startXI: (l.startXI ?? []).map(mapP),
        substitutes: (l.substitutes ?? []).map(mapP),
      };
    };

    const lineups = (f.lineups ?? []) as any[];

    return {
      available: true,
      venue: f.fixture?.venue?.name ?? null,
      referee: f.fixture?.referee ?? null,
      status: f.fixture?.status?.short ?? null,
      elapsed: f.fixture?.status?.elapsed ?? null,
      homeTeam: { name: f.teams?.home?.name ?? '', logo: f.teams?.home?.logo ?? null },
      awayTeam: { name: f.teams?.away?.name ?? '', logo: f.teams?.away?.logo ?? null },
      score: {
        halftime: f.score?.halftime ?? { home: null, away: null },
        fulltime: f.score?.fulltime ?? { home: null, away: null },
        extratime: f.score?.extratime ?? { home: null, away: null },
        penalty: f.score?.penalty ?? { home: null, away: null },
      },
      goals: goals.sort((a, b) => a.minute - b.minute),
      cards: cards.sort((a, b) => a.minute - b.minute),
      substitutions: substitutions.sort((a, b) => a.minute - b.minute),
      lineups: {
        home: mapLineup(lineups.find((l) => l.team?.id === homeId)),
        away: mapLineup(lineups.find((l) => l.team?.id !== homeId)),
      },
    };
  }

  /** Normalisiert Teamnamen für den Vergleich (Akzente weg, klein, Sonderzeichen weg). */
  private norm(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
  }

  private teamsMatch(a: string, b: string): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    // Erstes Wort vergleichen (z.B. "korea republic" vs "south korea")
    const fa = a.split(' ')[0];
    const fb = b.split(' ')[0];
    return fa.length > 2 && fa === fb;
  }
}
