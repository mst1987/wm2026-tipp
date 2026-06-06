import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Match, MatchesService } from '../../core/matches.service';
import { Standing, StandingsService } from '../../core/standings.service';
import { Tip, TipsService } from '../../core/tips.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  top5 = signal<Standing[]>([]);
  upcoming = signal<Match[]>([]);
  untippedCount = signal(0);
  loading = signal(true);

  constructor(
    public auth: AuthService,
    private matchesService: MatchesService,
    private standingsService: StandingsService,
    private tipsService: TipsService,
  ) {}

  ngOnInit() {
    forkJoin({
      standings: this.standingsService.getLeaderboard(),
      matches: this.matchesService.getUpcoming(),
      allMatches: this.auth.isLoggedIn ? this.matchesService.getAll() : of([] as Match[]),
      tips: this.auth.isLoggedIn ? this.tipsService.getMyTips() : of([] as Tip[]),
    }).subscribe({
      next: ({ standings, matches, allMatches, tips }) => {
        this.top5.set(standings.ranked.slice(0, 5));
        this.upcoming.set(matches.slice(0, 5));
        this.untippedCount.set(this.countUntipped(allMatches, tips));
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

  rankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  }

  avatarUrl(s: Standing): string {
    if (s.avatar) return `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  normalizeGroup(group: string | null): string {
    return group ? group.replace('GROUP_', '') : '';
  }
}
