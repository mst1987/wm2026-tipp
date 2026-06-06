import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Standing, StandingsService } from '../../core/standings.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standings.component.html',
  styleUrl: './standings.component.scss',
})
export class StandingsComponent implements OnInit {
  standings = signal<Standing[]>([]);
  unpaid = signal<Standing[]>([]);
  loading = signal(true);

  constructor(
    private standingsService: StandingsService,
    private router: Router,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.standingsService.getLeaderboard().subscribe({
      next: (data) => {
        this.standings.set(data.ranked);
        this.unpaid.set(data.unpaid);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openPlayer(s: Standing) {
    this.router.navigate(['/standings', s.id]);
  }

  avatarUrl(s: Standing): string {
    if (s.avatar) return `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  rankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  }
}
