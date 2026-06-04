import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Match, MatchStatus } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GoalEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  player: string;
  assist: string | null;
  detail: string;
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
  syncedAt?: string | null;
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

export interface ApiStatus {
  configured: boolean;
  lastCallAt: string | null;
  callsToday: number;
  dailyLimit: number;
  lastSyncAt: string | null;
  syncedMatches: number;
  totalMatches: number;
  isSyncing: boolean;
}

const DAILY_LIMIT = 100;
const SAFETY_MARGIN = 5; // ab 95 Calls keine automatischen Syncs mehr
const MAX_MATCHES_PER_RUN = 12;

@Injectable()
export class MatchDetailsService {
  private readonly logger = new Logger(MatchDetailsService.name);
  private syncing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Öffentlich: Detail-Abruf aus der DB (kein API-Call beim Seitenaufruf) ───

  async getDetails(matchId: string): Promise<MatchDetails> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Spiel nicht gefunden');

    if (match.detailsJson) {
      const data = match.detailsJson as unknown as MatchDetails;
      return { ...data, syncedAt: match.detailsSyncedAt?.toISOString() ?? null };
    }

    if (!this.isConfigured()) {
      return { available: false, message: 'API-Football ist nicht konfiguriert (API_FOOTBALL_KEY fehlt).' };
    }
    return {
      available: false,
      message: 'Für dieses Spiel wurden noch keine Detaildaten synchronisiert.',
      syncedAt: null,
    };
  }

  // ─── Admin: Status & manueller Sync ───

  async getApiStatus(): Promise<ApiStatus> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [lastCall, callsToday, lastSynced, syncedMatches, totalMatches] = await Promise.all([
      this.prisma.apiCallLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      this.prisma.apiCallLog.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.match.findFirst({
        where: { detailsSyncedAt: { not: null } },
        orderBy: { detailsSyncedAt: 'desc' },
      }),
      this.prisma.match.count({ where: { detailsSyncedAt: { not: null } } }),
      this.prisma.match.count(),
    ]);

    return {
      configured: this.isConfigured(),
      lastCallAt: lastCall?.createdAt.toISOString() ?? null,
      callsToday,
      dailyLimit: DAILY_LIMIT,
      lastSyncAt: lastSynced?.detailsSyncedAt?.toISOString() ?? null,
      syncedMatches,
      totalMatches,
      isSyncing: this.syncing,
    };
  }

  /** Manuell durch den Admin ausgelöster Sync. */
  async manualSync(): Promise<{ synced: number; skipped: string | null; status: ApiStatus }> {
    const result = await this.runSync(true);
    const status = await this.getApiStatus();
    return { ...result, status };
  }

  // ─── Cron: alle 15 Minuten relevante Spiele synchronisieren ───

  @Cron('0 */15 * * * *') // alle 15 Minuten
  async scheduledSync() {
    await this.runSync(false);
  }

  /**
   * Synchronisiert nur "relevante" Spiele, um das Tageslimit zu schonen:
   * - laufende Spiele (LIVE)
   * - beendete Spiele, deren Details noch nicht final geladen wurden
   * - Spiele, die in den nächsten 90 Minuten starten (für Aufstellungen)
   */
  private async runSync(manual: boolean): Promise<{ synced: number; skipped: string | null }> {
    if (!this.isConfigured()) {
      return { synced: 0, skipped: 'API-Football ist nicht konfiguriert.' };
    }
    if (this.syncing) {
      return { synced: 0, skipped: 'Ein Sync läuft bereits.' };
    }

    const callsToday = await this.countCallsToday();
    if (callsToday >= DAILY_LIMIT - SAFETY_MARGIN) {
      return { synced: 0, skipped: `Tageslimit fast erreicht (${callsToday}/${DAILY_LIMIT}).` };
    }

    this.syncing = true;
    try {
      const matches = await this.findRelevantMatches();
      let synced = 0;

      for (const match of matches.slice(0, MAX_MATCHES_PER_RUN)) {
        // Budget-Schutz auch innerhalb der Schleife
        if ((await this.countCallsToday()) >= DAILY_LIMIT - SAFETY_MARGIN) break;
        const ok = await this.fetchAndStoreDetails(match);
        if (ok) synced++;
      }

      if (synced > 0 || manual) {
        this.logger.log(`Match-Details-Sync (${manual ? 'manuell' : 'cron'}): ${synced} Spiele aktualisiert.`);
      }
      return { synced, skipped: null };
    } finally {
      this.syncing = false;
    }
  }

  private async findRelevantMatches(): Promise<Match[]> {
    const now = new Date();
    const in90min = new Date(now.getTime() + 90 * 60 * 1000);

    return this.prisma.match.findMany({
      where: {
        OR: [
          // laufende Spiele
          { status: MatchStatus.LIVE },
          // beendete Spiele, deren Details noch nicht (final) geladen wurden
          {
            status: MatchStatus.FINISHED,
            OR: [
              { detailsSyncedAt: null },
              { detailsSyncedAt: { lt: this.prisma.match.fields.updatedAt } },
            ],
          },
          // bald startende Spiele ohne Detaildaten (Aufstellungen)
          {
            status: MatchStatus.SCHEDULED,
            matchDate: { gte: now, lte: in90min },
            detailsSyncedAt: null,
          },
        ],
      },
      orderBy: { matchDate: 'asc' },
    });
  }

  /** Holt Details für ein Spiel von der API und speichert sie in der DB. */
  private async fetchAndStoreDetails(match: Match): Promise<boolean> {
    try {
      let fixtureId = match.apiFootballId;
      if (!fixtureId) {
        fixtureId = await this.resolveFixtureId(match.teamHome, match.teamAway, match.matchDate);
        if (fixtureId) {
          await this.prisma.match.update({ where: { id: match.id }, data: { apiFootballId: fixtureId } });
        }
      }
      if (!fixtureId) return false;

      const details = await this.fetchFixture(fixtureId);
      await this.prisma.match.update({
        where: { id: match.id },
        data: {
          detailsJson: details as any,
          detailsSyncedAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Fehler beim Sync von Match ${match.id}: ${err?.message}`);
      return false;
    }
  }

  // ─── API-Football Low-Level (mit Call-Logging) ───

  private isConfigured(): boolean {
    const key = this.config.get<string>('API_FOOTBALL_KEY');
    return !!key && key !== 'your_api_football_key';
  }

  private headers() {
    return { 'x-apisports-key': this.config.get<string>('API_FOOTBALL_KEY') };
  }

  private baseUrl(): string {
    return this.config.get<string>('API_FOOTBALL_BASE_URL', 'https://v3.football.api-sports.io');
  }

  private async countCallsToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.apiCallLog.count({ where: { createdAt: { gte: startOfDay } } });
  }

  /** Zentraler API-Aufruf — protokolliert jeden Call zur Limit-Überwachung. */
  private async apiGet(endpoint: string, params: Record<string, any>): Promise<any> {
    let success = false;
    try {
      const { data } = await axios.get(`${this.baseUrl()}${endpoint}`, {
        headers: this.headers(),
        params,
      });
      success = true;
      return data;
    } finally {
      await this.prisma.apiCallLog
        .create({ data: { provider: 'api-football', endpoint, success } })
        .catch(() => undefined);
    }
  }

  private async resolveFixtureId(
    teamHome: string,
    teamAway: string,
    matchDate: Date,
  ): Promise<number | null> {
    const league = this.config.get<string>('API_FOOTBALL_LEAGUE', '1');
    const season = this.config.get<string>('API_FOOTBALL_SEASON', '2026');
    const dateStr = matchDate.toISOString().slice(0, 10);

    const data = await this.apiGet('/fixtures', { league, season, date: dateStr });
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

  private async fetchFixture(fixtureId: number): Promise<MatchDetails> {
    const data = await this.apiGet('/fixtures', { id: fixtureId });
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
        if (detail === 'Missed Penalty') continue;
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
          playerIn: e.assist?.name ?? '—',
          playerOut: e.player?.name ?? '—',
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
    const fa = a.split(' ')[0];
    const fb = b.split(' ')[0];
    return fa.length > 2 && fa === fb;
  }
}
