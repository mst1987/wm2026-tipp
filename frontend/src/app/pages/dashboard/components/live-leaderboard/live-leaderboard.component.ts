import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiveStanding } from '../../../../core/standings.service';
import { Match } from '../../../../core/matches.service';

@Component({
  selector: 'app-live-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './live-leaderboard.component.html',
  styleUrl: './live-leaderboard.component.scss',
})
export class LiveLeaderboardComponent {
  @Input() entries: LiveStanding[] = [];
  @Input() currentUserId: string | null = null;
  @Input() liveMatch: Match | null = null;

  rankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  }

  avatarUrl(s: LiveStanding): string {
    if (s.avatar) return `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  /** Tipp des Spielers für das aktuell angezeigte Live-Spiel. */
  tipFor(s: LiveStanding) {
    if (!this.liveMatch) return null;
    return s.liveTips.find((t) => t.matchId === this.liveMatch!.id) ?? null;
  }

  pointsClass(points: number): string {
    if (points === 3) return 'exact';
    if (points === 2) return 'diff';
    if (points === 1) return 'tendency';
    return 'wrong';
  }
}
