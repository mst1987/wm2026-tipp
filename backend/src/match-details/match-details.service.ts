import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Match, MatchStatus } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { TipsService } from '../tips/tips.service';

/** API-Football Status-Kürzel → interner Match-Status. */
const AF_STATUS: Record<string, MatchStatus> = {
  TBD: MatchStatus.SCHEDULED, NS: MatchStatus.SCHEDULED,
  '1H': MatchStatus.LIVE, HT: MatchStatus.LIVE, '2H': MatchStatus.LIVE,
  ET: MatchStatus.LIVE, BT: MatchStatus.LIVE, P: MatchStatus.LIVE,
  LIVE: MatchStatus.LIVE, INT: MatchStatus.LIVE, SUSP: MatchStatus.LIVE,
  FT: MatchStatus.FINISHED, AET: MatchStatus.FINISHED, PEN: MatchStatus.FINISHED,
  AWD: MatchStatus.FINISHED, WO: MatchStatus.FINISHED,
  PST: MatchStatus.POSTPONED,
  CANC: MatchStatus.CANCELLED, ABD: MatchStatus.CANCELLED,
};

const FINAL_AF_STATUS = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

/**
 * Bekannte Namensvarianten zwischen football-data.org und API-Football
 * auf eine kanonische (normalisierte) Form bringen. Dice fängt den Rest ab.
 */
const TEAM_ALIASES: Record<string, string> = {
  usa: 'united states',
  'czech republic': 'czechia',
  turkiye: 'turkey',
  'ir iran': 'iran',
  'korea republic': 'south korea',
  'korea dpr': 'north korea',
  'cape verde islands': 'cape verde',
  'china pr': 'china',
};

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

export interface ScorerEntry {
  player: string;
  team: string | null;
  goals: number;
  assists: number;
  points: number; // Tore + Vorlagen (für Sortierung/Scorer-Wertung)
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

const DAILY_LIMIT = Number(process.env.API_FOOTBALL_DAILY_LIMIT ?? 7500);
const SAFETY_MARGIN = 100; // Puffer zum Tageslimit
const MAX_MATCHES_PER_RUN = 12;

interface FixtureResult {
  details: MatchDetails;
  afStatusShort: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
}

@Injectable()
export class MatchDetailsService {
  private readonly logger = new Logger(MatchDetailsService.name);
  private syncing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tipsService: TipsService,
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

  /** Aggregiert Tore & Vorlagen aller synchronisierten Spiele (turnierweite Scorer-Liste). */
  async getTopScorers(): Promise<ScorerEntry[]> {
    const matches = await this.prisma.match.findMany({
      select: { detailsJson: true },
    });

    const map = new Map<string, ScorerEntry>();
    const ensure = (player: string, team: string | null): ScorerEntry => {
      let e = map.get(player);
      if (!e) {
        e = { player, team, goals: 0, assists: 0, points: 0 };
        map.set(player, e);
      } else if (!e.team && team) {
        e.team = team;
      }
      return e;
    };

    for (const m of matches) {
      const d = m.detailsJson as unknown as MatchDetails;
      if (!d?.goals?.length) continue;
      for (const g of d.goals) {
        const teamName = g.team === 'home' ? d.homeTeam?.name ?? null : d.awayTeam?.name ?? null;
        // Eigentore zählen nicht als Tor des Schützen
        if (!g.isOwnGoal && g.player) {
          ensure(g.player, teamName).goals++;
        }
        if (g.assist) {
          ensure(g.assist, teamName).assists++;
        }
      }
    }

    return Array.from(map.values())
      .map((e) => ({ ...e, points: e.goals + e.assists }))
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
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

  // ─── Cron: jede Minute relevante Spiele synchronisieren ───

  @Cron('0 * * * * *') // jede Minute (nahezu Echtzeit während Live-Spielen)
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
    // Zeitfenster entkoppelt vom (ggf. verzögerten) football-data.org-Status:
    // ab 90 Min vor Anpfiff (Aufstellungen) bis 3,5 Std danach (Live + Endstand)
    const windowStart = new Date(now.getTime() - 3.5 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 90 * 60 * 1000);

    return this.prisma.match.findMany({
      where: {
        OR: [
          // laufende Spiele (laut DB)
          { status: MatchStatus.LIVE },
          // Spiele im Live-Zeitfenster — unabhängig vom DB-Status
          {
            matchDate: { gte: windowStart, lte: windowEnd },
            status: { notIn: [MatchStatus.POSTPONED, MatchStatus.CANCELLED] },
          },
          // Sicherheitsnetz: beendete Spiele ganz ohne Details
          { status: MatchStatus.FINISHED, detailsSyncedAt: null },
        ],
      },
      orderBy: { matchDate: 'asc' },
    });
  }

  /** Holt Details für ein Spiel von der API, speichert sie und aktualisiert Status/Score. */
  private async fetchAndStoreDetails(match: Match): Promise<boolean> {
    try {
      // Bereits final geladenes Spiel mit gültigem Endstand nicht erneut abrufen
      const stored = match.detailsJson as unknown as MatchDetails | null;
      if (
        match.status === MatchStatus.FINISHED &&
        match.scoreHome !== null &&
        stored?.status &&
        FINAL_AF_STATUS.includes(stored.status)
      ) {
        return false;
      }

      let fixtureId = match.apiFootballId;
      if (!fixtureId) {
        fixtureId = await this.resolveFixtureId(match.teamHome, match.teamAway, match.matchDate);
        if (fixtureId) {
          await this.prisma.match.update({ where: { id: match.id }, data: { apiFootballId: fixtureId } });
        }
      }
      if (!fixtureId) return false;

      const result = await this.fetchFixture(fixtureId);
      const newStatus = result.afStatusShort
        ? AF_STATUS[result.afStatusShort] ?? match.status
        : match.status;

      await this.prisma.match.update({
        where: { id: match.id },
        data: {
          detailsJson: result.details as any,
          detailsSyncedAt: new Date(),
          status: newStatus,
          scoreHome: result.scoreHome,
          scoreAway: result.scoreAway,
        },
      });

      // Punkte berechnen, sobald das Spiel beendet ist (idempotent — wertet
      // nur noch nicht vergebene Tipps aus)
      if (newStatus === MatchStatus.FINISHED && result.scoreHome !== null) {
        await this.tipsService.calculatePoints(match.id);
      }
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

    // Bestes Fixture nach Namensähnlichkeit wählen (robust gegen Varianten
    // wie "Czechia" vs "Czech Republic"). Datum + beide Teams disambiguieren.
    let best: any = null;
    let bestScore = 0;
    for (const f of fixtures) {
      const fh = this.norm(f.teams?.home?.name ?? '');
      const fa = this.norm(f.teams?.away?.name ?? '');
      const sh = this.similarity(nh, fh);
      const sa = this.similarity(na, fa);
      if (sh >= 0.34 && sa >= 0.34 && sh + sa > bestScore) {
        bestScore = sh + sa;
        best = f;
      }
    }
    return bestScore >= 1.0 ? best?.fixture?.id ?? null : null;
  }

  private async fetchFixture(fixtureId: number): Promise<FixtureResult> {
    const data = await this.apiGet('/fixtures', { id: fixtureId });
    const f = data?.response?.[0];
    if (!f) {
      return { details: { available: false, message: 'Keine Detaildaten verfügbar.' }, afStatusShort: null, scoreHome: null, scoreAway: null };
    }

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

    const details: MatchDetails = {
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

    // Effektives Ergebnis = Stand nach regulärer Spielzeit/Verlängerung plus die
    // Tore aus dem Elfmeterschießen. API-Football 'goals' = Stand vor dem
    // Elfmeterschießen (das Unentschieden), 'score.penalty' = Elfmeter-Tore.
    // Beispiel: 1:1, i.E. 4:3 ⇒ 5:4.
    let scoreHome = f.goals?.home ?? null;
    let scoreAway = f.goals?.away ?? null;
    const penHome = f.score?.penalty?.home ?? null;
    const penAway = f.score?.penalty?.away ?? null;
    if (penHome !== null && penAway !== null && scoreHome !== null && scoreAway !== null) {
      scoreHome += penHome;
      scoreAway += penAway;
    }

    return {
      details,
      afStatusShort: f.fixture?.status?.short ?? null,
      scoreHome,
      scoreAway,
    };
  }

  private norm(name: string): string {
    const n = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return TEAM_ALIASES[n] ?? n;
  }

  /** Ähnlichkeit zweier normalisierter Teamnamen (0..1). */
  private similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.95;
    return this.dice(a.replace(/ /g, ''), b.replace(/ /g, ''));
  }

  /** Sørensen-Dice-Koeffizient über Zeichen-Bigramme. */
  private dice(a: string, b: string): number {
    if (a.length < 2 || b.length < 2) return 0;
    const bigrams = (s: string) => {
      const m = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const g = s.slice(i, i + 2);
        m.set(g, (m.get(g) ?? 0) + 1);
      }
      return m;
    };
    const A = bigrams(a);
    const B = bigrams(b);
    let overlap = 0;
    for (const [g, c] of A) {
      const d = B.get(g);
      if (d) overlap += Math.min(c, d);
    }
    return (2 * overlap) / (a.length - 1 + (b.length - 1));
  }
}
