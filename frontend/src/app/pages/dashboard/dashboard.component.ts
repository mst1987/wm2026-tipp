import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Match, MatchesService } from '../../core/matches.service';
import { Standing, StandingsService } from '../../core/standings.service';

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
  loading = signal(true);

  constructor(
    public auth: AuthService,
    private matchesService: MatchesService,
    private standingsService: StandingsService,
  ) {}

  ngOnInit() {
    forkJoin({
      standings: this.standingsService.getLeaderboard(),
      matches: this.matchesService.getUpcoming(),
    }).subscribe({
      next: ({ standings, matches }) => {
        this.top5.set(standings.slice(0, 5));
        this.upcoming.set(matches.slice(0, 5));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
