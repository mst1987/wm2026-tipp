import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Match, MatchesService, ScorerEntry } from '../../core/matches.service';
import { Standing, StandingsService } from '../../core/standings.service';
import { Tip, TipsService } from '../../core/tips.service';
import { MatchDetails, MatchDetailsService } from '../../core/match-details.service';
import { PotCardComponent } from './components/pot-card/pot-card.component';
import { RulesCardComponent } from './components/rules-card/rules-card.component';
import { LiveMatchCardComponent } from './components/live-match-card/live-match-card.component';
import { TopScorersComponent } from './components/top-scorers/top-scorers.component';
import { LeaderboardPreviewComponent } from './components/leaderboard-preview/leaderboard-preview.component';
import { UpcomingMatchesComponent } from './components/upcoming-matches/upcoming-matches.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PotCardComponent,
    RulesCardComponent,
    LiveMatchCardComponent,
    TopScorersComponent,
    LeaderboardPreviewComponent,
    UpcomingMatchesComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  top5 = signal<Standing[]>([]);
  upcoming = signal<Match[]>([]);
  untippedCount = signal(0);
  loading = signal(true);

  paidCount = signal(0);
  scorers = signal<ScorerEntry[]>([]);
  liveMatch = signal<Match | null>(null);
  liveDetails = signal<MatchDetails | null>(null);

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
    }).subscribe({
      next: ({ standings, matches, allMatches, tips, scorers }) => {
        this.top5.set(standings.ranked.slice(0, 5));
        this.paidCount.set(standings.ranked.length);
        this.upcoming.set(matches.filter((m) => m.status !== 'LIVE').slice(0, 5));
        this.untippedCount.set(this.countUntipped(allMatches, tips));
        this.scorers.set(scorers.slice(0, 10));

        const live = matches.find((m) => m.status === 'LIVE');
        if (live) {
          this.liveMatch.set(live);
          this.matchDetailsService.getDetails(live.id).subscribe({
            next: (d) => this.liveDetails.set(d),
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
