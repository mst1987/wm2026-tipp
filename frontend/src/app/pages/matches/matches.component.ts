import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Match, MatchesService } from '../../core/matches.service';
import { Tip, TipsService } from '../../core/tips.service';
import { AuthService } from '../../core/auth.service';

interface TipForm {
  home: number | null;
  away: number | null;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

const GROUP_COLORS: Record<string, string> = {
  A: '#e74c3c', B: '#e67e22', C: '#f1c40f', D: '#2ecc71',
  E: '#1abc9c', F: '#3498db', G: '#9b59b6', H: '#e91e63',
  I: '#ff5722', J: '#8bc34a', K: '#00bcd4', L: '#ff9800',
};

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent implements OnInit {
  matches = signal<Match[]>([]);
  tips = signal<Map<string, Tip>>(new Map());
  forms = signal<Map<string, TipForm>>(new Map());
  loading = signal(true);
  activeGroup = signal<string>('all');

  constructor(
    private matchesService: MatchesService,
    private tipsService: TipsService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    const tipsObs = this.auth.isLoggedIn
      ? this.tipsService.getMyTips()
      : new (class { subscribe(o: any) { o.next([]); } })() as any;

    forkJoin({
      matches: this.matchesService.getAll(),
      tips: this.auth.isLoggedIn ? this.tipsService.getMyTips() : Promise.resolve([]),
    }).subscribe({
      next: ({ matches, tips }) => {
        // Normalize group names: GROUP_A → A
        const normalized = matches.map((m) => ({
          ...m,
          group: m.group ? m.group.replace('GROUP_', '') : null,
        }));
        this.matches.set(normalized);

        const tipMap = new Map((tips as Tip[]).map((t) => [t.matchId, t]));
        this.tips.set(tipMap);

        const formMap = new Map<string, TipForm>();
        for (const m of normalized) {
          const existing = tipMap.get(m.id);
          formMap.set(m.id, {
            home: existing?.predictedHome ?? null,
            away: existing?.predictedAway ?? null,
            saving: false,
            saved: !!existing,
            error: null,
          });
        }
        this.forms.set(formMap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get groups(): string[] {
    const groups = new Set<string>();
    for (const m of this.matches()) {
      if (m.group) groups.add(m.group);
    }
    return ['all', ...Array.from(groups).sort()];
  }

  get filteredMatches(): Match[] {
    const g = this.activeGroup();
    return this.matches().filter((m) => g === 'all' || m.group === g);
  }

  groupLabel(g: string): string {
    return g === 'all' ? 'Alle' : `Gruppe ${g}`;
  }

  groupColor(group: string | null): string {
    if (!group) return '#30363d';
    return GROUP_COLORS[group] ?? '#30363d';
  }

  canTip(match: Match): boolean {
    if (!this.auth.isLoggedIn) return false;
    const deadline = new Date(new Date(match.matchDate).getTime() - 10 * 60 * 1000);
    return match.status === 'SCHEDULED' && new Date() < deadline;
  }

  isDeadlinePassed(match: Match): boolean {
    const deadline = new Date(new Date(match.matchDate).getTime() - 10 * 60 * 1000);
    return match.status === 'SCHEDULED' && new Date() >= deadline;
  }

  minutesToDeadline(match: Match): number {
    const deadline = new Date(new Date(match.matchDate).getTime() - 10 * 60 * 1000);
    return Math.ceil((deadline.getTime() - Date.now()) / 60000);
  }

  saveTip(match: Match) {
    const formMap = new Map(this.forms());
    const form = formMap.get(match.id)!;
    if (form.home === null || form.away === null) return;

    form.saving = true;
    form.error = null;
    this.forms.set(formMap);

    this.tipsService.submitTip(match.id, form.home, form.away).subscribe({
      next: (tip) => {
        const tipMap = new Map(this.tips());
        tipMap.set(match.id, tip);
        this.tips.set(tipMap);
        const f = { ...form, saving: false, saved: true };
        const newMap = new Map(this.forms());
        newMap.set(match.id, f);
        this.forms.set(newMap);
      },
      error: (err) => {
        const f = { ...form, saving: false, error: err?.error?.message ?? 'Fehler beim Speichern' };
        const newMap = new Map(this.forms());
        newMap.set(match.id, f);
        this.forms.set(newMap);
      },
    });
  }

  getForm(matchId: string): TipForm {
    return this.forms().get(matchId) ?? { home: null, away: null, saving: false, saved: false, error: null };
  }

  updateForm(matchId: string, field: 'home' | 'away', value: number) {
    const formMap = new Map(this.forms());
    const form = formMap.get(matchId);
    if (!form) return;
    this.forms.set(new Map(formMap).set(matchId, { ...form, [field]: value, saved: false }));
  }

  /** Berechnet erzielte oder aktuell mögliche Punkte für einen Tipp */
  calcPoints(tip: Tip, match: Match): number | null {
    if (match.scoreHome === null || match.scoreAway === null) return null;
    const ph = tip.predictedHome, pa = tip.predictedAway;
    const ah = match.scoreHome,   aa = match.scoreAway;
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
  }

  pointsClass(points: number | null): string {
    if (points === 3) return 'pts-exact';
    if (points === 1) return 'pts-tendency';
    if (points === 0) return 'pts-wrong';
    return '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  statusLabel(status: Match['status']): string {
    return { SCHEDULED: 'Geplant', LIVE: 'LIVE', FINISHED: 'Beendet', POSTPONED: 'Verschoben', CANCELLED: 'Abgesagt' }[status] ?? status;
  }
}
