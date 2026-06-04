import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnockoutMatch, KnockoutStage, KnockoutService } from '../../core/knockout.service';

@Component({
  selector: 'app-knockout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knockout.component.html',
  styleUrl: './knockout.component.scss',
})
export class KnockoutComponent implements OnInit {
  stages = signal<KnockoutStage[]>([]);
  loading = signal(true);

  constructor(private knockoutService: KnockoutService) {}

  ngOnInit() {
    this.knockoutService.getKnockoutStages().subscribe({
      next: (data) => { this.stages.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isTbd(team: string): boolean {
    return !team || team === 'TBD';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  hasAnyResult(stage: KnockoutStage): boolean {
    return stage.matches.some((m) => m.status === 'FINISHED' || m.status === 'LIVE');
  }

  stageIcon(stage: string): string {
    const icons: Record<string, string> = {
      LAST_32:        '32',
      LAST_16:        '16',
      QUARTER_FINALS: '¼',
      SEMI_FINALS:    '½',
      THIRD_PLACE:    '3.',
      FINAL:          '🏆',
    };
    return icons[stage] ?? '';
  }

  matchClass(m: KnockoutMatch): string {
    if (m.status === 'LIVE') return 'live';
    if (m.status === 'FINISHED') return 'finished';
    return '';
  }

  winnerHome(m: KnockoutMatch): boolean {
    return m.status === 'FINISHED' && m.scoreHome !== null && m.scoreAway !== null && m.scoreHome > m.scoreAway;
  }

  winnerAway(m: KnockoutMatch): boolean {
    return m.status === 'FINISHED' && m.scoreHome !== null && m.scoreAway !== null && m.scoreAway > m.scoreHome;
  }
}
