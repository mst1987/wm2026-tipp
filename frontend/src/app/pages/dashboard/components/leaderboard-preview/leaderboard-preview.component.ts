import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Standing } from '../../../../core/standings.service';

@Component({
  selector: 'app-leaderboard-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leaderboard-preview.component.html',
  styleUrl: './leaderboard-preview.component.scss',
})
export class LeaderboardPreviewComponent {
  @Input() entries: Standing[] = [];
  @Input() currentUserId: string | null = null;

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
}
