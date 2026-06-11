import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchStatus } from '@prisma/client';
import axios from 'axios';
import { MatchesService } from '../matches/matches.service';
import { TipsService } from '../tips/tips.service';

const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: MatchStatus.SCHEDULED,
  TIMED: MatchStatus.SCHEDULED,
  IN_PLAY: MatchStatus.LIVE,
  PAUSED: MatchStatus.LIVE,
  FINISHED: MatchStatus.FINISHED,
  POSTPONED: MatchStatus.POSTPONED,
  CANCELLED: MatchStatus.CANCELLED,
  SUSPENDED: MatchStatus.CANCELLED,
};

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly matchesService: MatchesService,
    private readonly tipsService: TipsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncMatches() {
    const apiKey = this.config.get<string>('FOOTBALL_API_KEY');
    const baseUrl = this.config.get<string>('FOOTBALL_API_BASE_URL', 'https://api.football-data.org/v4');

    if (!apiKey || apiKey === 'your_football_data_api_key') return;

    try {
      const { data } = await axios.get(`${baseUrl}/competitions/WC/matches`, {
        headers: { 'X-Auth-Token': apiKey },
      });

      for (const m of data.matches) {
        const mapped = this.mapMatch(m);

        // Wird das Spiel gerade live von API-Football gepflegt (Status/Score),
        // den (ggf. veralteten) football-data.org-Stand NICHT überschreiben.
        const existing = await this.matchesService.findByExternalId(m.id);
        const liveSynced =
          existing?.apiFootballId &&
          existing.detailsSyncedAt &&
          Date.now() - existing.detailsSyncedAt.getTime() < 20 * 60 * 1000;
        if (liveSynced) continue;

        const saved = await this.matchesService.upsertFromApi(mapped);
        if (mapped.status === MatchStatus.FINISHED) {
          await this.tipsService.calculatePoints(saved.id);
        }
      }

      this.logger.log(`Synced ${data.matches.length} matches from football-data.org`);
    } catch (err: any) {
      this.logger.error('Failed to sync matches', err?.message);
    }
  }

  private mapMatch(m: any) {
    return {
      externalId: m.id as number,
      matchDate: new Date(m.utcDate),
      teamHome: (m.homeTeam.name as string) || 'TBD',
      teamAway: (m.awayTeam.name as string) || 'TBD',
      teamHomeLogo: m.homeTeam.crest as string | undefined,
      teamAwayLogo: m.awayTeam.crest as string | undefined,
      scoreHome: m.score?.fullTime?.home ?? null,
      scoreAway: m.score?.fullTime?.away ?? null,
      status: STATUS_MAP[m.status] ?? MatchStatus.SCHEDULED,
      stage: m.stage as string,
      group: (m.group as string) ?? null,
    };
  }
}
