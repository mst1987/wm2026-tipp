import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Tip, TipsService } from '../../core/tips.service';
import { User } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

const GROUP_COLORS: Record<string, string> = {
  A: '#e74c3c', B: '#e67e22', C: '#f1c40f', D: '#2ecc71',
  E: '#1abc9c', F: '#3498db', G: '#9b59b6', H: '#e91e63',
  I: '#ff5722', J: '#8bc34a', K: '#00bcd4', L: '#ff9800',
};

@Component({
  selector: 'app-player-tips',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player-tips.component.html',
  styleUrl: './player-tips.component.scss',
})
export class PlayerTipsComponent implements OnInit {
  user = signal<User | null>(null);
  tips = signal<Tip[]>([]);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private tipsService: TipsService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId')!;
    forkJoin({
      user: this.http.get<User>(`${environment.apiUrl}/users/${userId}`),
      tips: this.tipsService.getTipsByUser(userId),
    }).subscribe({
      next: ({ user, tips }) => {
        this.user.set(user);
        this.tips.set(tips);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  avatarUrl(user: User): string {
    if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  totalPoints(): number {
    return this.tips().filter((t) => t.pointsAwarded).reduce((s, t) => s + t.points, 0);
  }

  exactCount(): number {
    return this.tips().filter((t) => t.pointsAwarded && t.points === 3).length;
  }

  tendencyCount(): number {
    return this.tips().filter((t) => t.pointsAwarded && t.points === 1).length;
  }

  hasResult(tip: Tip): boolean {
    const m = tip.match;
    return (m.status === 'FINISHED' || m.status === 'LIVE') &&
      m.scoreHome !== null && m.scoreAway !== null;
  }

  resultLabel(tip: Tip): string {
    const m = tip.match;
    if (this.hasResult(tip)) return `${m.scoreHome} : ${m.scoreAway}`;
    return '–';
  }

  tipClass(tip: Tip): string {
    if (!tip.pointsAwarded) return '';
    if (tip.points === 3) return 'exact';
    if (tip.points === 1) return 'tendency';
    return 'wrong';
  }

  normalizeGroup(group: string | null): string {
    return group ? group.replace('GROUP_', '') : '';
  }

  groupColor(group: string | null): string {
    const g = this.normalizeGroup(group);
    return GROUP_COLORS[g] ?? '#58a6ff';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }
}
