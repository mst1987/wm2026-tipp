import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Match, MatchesService, ScorerEntry } from '../../core/matches.service';
import { Standing, StandingsService, LiveStanding } from '../../core/standings.service';
import { Tip, TipsService } from '../../core/tips.service';
import { MatchDetails, MatchDetailsService } from '../../core/match-details.service';
import { PotCardComponent } from './components/pot-card/pot-card.component';
import { RulesCardComponent } from './components/rules-card/rules-card.component';
import { LiveMatchCardComponent } from './components/live-match-card/live-match-card.component';
import { LiveLeaderboardComponent } from './components/live-leaderboard/live-leaderboard.component';
import { TopScorersComponent } from './components/top-scorers/top-scorers.component';
import { LeaderboardPreviewComponent } from './components/leaderboard-preview/leaderboard-preview.component';
import { UpcomingMatchesComponent } from './components/upcoming-matches/upcoming-matches.component';
import { RecentResultsComponent } from './components/recent-results/recent-results.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PotCardComponent,
    RulesCardComponent,
    LiveMatchCardComponent,
    LiveLeaderboardComponent,
    TopScorersComponent,
    LeaderboardPreviewComponent,
    UpcomingMatchesComponent,
    RecentResultsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  top5 = signal<Standing[]>([]);
  upcoming = signal<Match[]>([]);
  untippedCount = signal(0);
  loading = signal(true);

  paidCount = signal(0);
  scorers = signal<ScorerEntry[]>([]);
  recent = signal<Match[]>([]);
  liveMatch = signal<Match | null>(null);
  liveDetails = signal<MatchDetails | null>(null);
  liveStandings = signal<LiveStanding[]>([]);

  private liveTimer?: ReturnType<typeof setInterval>;

  constructor(
    public auth: AuthService,
    private matchesService: MatchesService,
    private standingsService: StandingsService,
    private tipsService: TipsService,
    private matchDetailsService: MatchDetailsService,
  ) {}

  ngOnInit() {
    forkJoin({
      standings: this.standingsService.getLeaderboard(),
      matches: this.matchesService.getUpcoming(),
      allMatches: this.auth.isLoggedIn ? this.matchesService.getAll() : of([] as Match[]),
      tips: this.auth.isLoggedIn ? this.tipsService.getMyTips() : of([] as Tip[]),
      scorers: this.matchesService.getScorers(),
      recent: this.matchesService.getRecent(),
      live: this.standingsService.getLiveLeaderboard(),
    }).subscribe({
      next: ({ standings, matches, allMatches, tips, scorers, recent, live }) => {
        this.top5.set(standings.ranked.slice(0, 5));
        this.paidCount.set(standings.ranked.length);
        this.upcoming.set(matches.filter((m) => m.status !== 'LIVE').slice(0, 5));
        this.untippedCount.set(this.countUntipped(allMatches, tips));
        this.scorers.set(scorers.slice(0, 10));
        this.recent.set(recent);
        this.liveStandings.set(live.entries);

        this.applyLiveMatch(matches);
        this.loading.set(false);

        // Während Live-Spielen alle 60 Sek aktualisieren
        this.liveTimer = setInterval(() => this.refreshLive(), 60_000);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    if (this.liveTimer) clearInterval(this.liveTimer);
  }

  /** Live-Spiel + Detail-Daten aus der Spielliste übernehmen. */
  private applyLiveMatch(matches: Match[]) {
    const live = matches.find((m) => m.status === 'LIVE') ?? null;
    this.liveMatch.set(live);
    if (live) {
      this.matchDetailsService.getDetails(live.id).subscribe({
        next: (d) => this.liveDetails.set(d),
      });
    } else {
      this.liveDetails.set(null);
    }
  }

  /** Periodische Aktualisierung von Live-Spiel, Details und Live-Rangliste. */
  private refreshLive() {
    this.matchesService.getUpcoming().subscribe({
      next: (matches) => this.applyLiveMatch(matches),
    });
    this.standingsService.getLiveLeaderboard().subscribe({
      next: (lb) => this.liveStandings.set(lb.entries),
    });
  }

  /** Zählt tippbare Spiele (offen, Deadline noch nicht erreicht) ohne abgegebenen Tipp. */
  private countUntipped(matches: Match[], tips: Tip[]): number {
    const tipped = new Set(tips.map((t) => t.matchId));
    const now = Date.now();
    return matches.filter((m) => {
      if (m.status !== 'SCHEDULED') return false;
      const deadline = new Date(m.matchDate).getTime() - 10 * 60 * 1000;
      return now < deadline && !tipped.has(m.id);
    }).length;
  }
}
