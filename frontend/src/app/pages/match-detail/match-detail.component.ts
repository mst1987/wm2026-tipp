import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  MatchDetails, MatchDetailsService, GoalEvent, CardEvent, SubEvent,
} from '../../core/match-details.service';
import { Match } from '../../core/matches.service';
import { MatchTip, TipsService } from '../../core/tips.service';

const GROUP_COLORS: Record<string, string> = {
  A: '#e74c3c', B: '#e67e22', C: '#f1c40f', D: '#2ecc71',
  E: '#1abc9c', F: '#3498db', G: '#9b59b6', H: '#e91e63',
  I: '#ff5722', J: '#8bc34a', K: '#00bcd4', L: '#ff9800',
};

interface TimelineItem {
  kind: 'goal' | 'card' | 'sub';
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  // Tor
  player?: string;
  assist?: string | null;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
  // Karte
  card?: 'yellow' | 'red';
  // Wechsel
  playerIn?: string;
  playerOut?: string;
}

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
})
export class MatchDetailComponent implements OnInit, OnDestroy {
  match = signal<Match | null>(null);
  details = signal<MatchDetails | null>(null);
  matchTips = signal<MatchTip[]>([]);
  tipsVisible = signal(false);
  loading = signal(true);

  private matchId!: string;
  private liveTimer?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private service: MatchDetailsService,
    private tipsService: TipsService,
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      match: this.service.getMatch(this.matchId),
      details: this.service.getDetails(this.matchId),
      tips: this.tipsService.getMatchTips(this.matchId),
    }).subscribe({
      next: ({ match, details, tips }) => {
        this.match.set(match);
        this.details.set(details);
        this.matchTips.set(tips.tips);
        this.tipsVisible.set(tips.visible);
        this.loading.set(false);

        // Bei laufendem Spiel alle 60 Sek aktualisieren (Stand + Tipp-Punkte)
        if (match?.status === 'LIVE') {
          this.liveTimer = setInterval(() => this.refreshLive(), 60_000);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    if (this.liveTimer) clearInterval(this.liveTimer);
  }

  private refreshLive() {
    this.service.getMatch(this.matchId).subscribe({ next: (m) => this.match.set(m) });
    this.service.getDetails(this.matchId).subscribe({ next: (d) => this.details.set(d) });
    this.tipsService.getMatchTips(this.matchId).subscribe({
      next: (t) => { this.matchTips.set(t.tips); this.tipsVisible.set(t.visible); },
    });
  }

  avatarUrl(t: MatchTip): string {
    if (t.avatar) return `https://cdn.discordapp.com/avatars/${t.discordId}/${t.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  pointsClass(points: number | null): string {
    if (points === 3) return 'exact';
    if (points === 2) return 'diff';
    if (points === 1) return 'tendency';
    if (points === 0) return 'wrong';
    return '';
  }

  /** Vereinte, chronologische Timeline aus Toren, Karten und Wechseln. */
  timeline = computed<TimelineItem[]>(() => {
    const d = this.details();
    if (!d?.available) return [];
    const items: TimelineItem[] = [
      ...(d.goals ?? []).map((g): TimelineItem => ({ kind: 'goal', ...g })),
      ...(d.cards ?? []).map((c): TimelineItem => ({ kind: 'card', ...c })),
      ...(d.substitutions ?? []).map((s): TimelineItem => ({ kind: 'sub', ...s })),
    ];
    return items.sort((a, b) => (a.minute - b.minute) || (a.extra ?? 0) - (b.extra ?? 0));
  });

  hasEvents = computed(() => this.timeline().length > 0);

  hasLineups = computed(() => {
    const l = this.details()?.lineups;
    return !!(l?.home?.startXI?.length || l?.away?.startXI?.length);
  });

  normalizeGroup(group: string | null | undefined): string {
    return group ? group.replace('GROUP_', '') : '';
  }

  groupColor(group: string | null | undefined): string {
    const g = this.normalizeGroup(group);
    return GROUP_COLORS[g] ?? '#58a6ff';
  }

  stageLabel(stage: string | undefined): string {
    const labels: Record<string, string> = {
      GROUP_STAGE: 'Gruppenphase', LAST_32: 'Sechzehntelfinale', LAST_16: 'Achtelfinale',
      QUARTER_FINALS: 'Viertelfinale', SEMI_FINALS: 'Halbfinale',
      THIRD_PLACE: 'Spiel um Platz 3', FINAL: 'Finale',
    };
    return stage ? labels[stage] ?? stage : '';
  }

  minuteLabel(minute: number, extra: number | null): string {
    return extra ? `${minute}+${extra}'` : `${minute}'`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /** Anzeige-Ergebnis: bevorzugt API-Details, sonst DB. */
  displayScore(): { home: number | null; away: number | null } {
    const d = this.details();
    const m = this.match();
    if (d?.available && d.score?.fulltime?.home !== null && d.score?.fulltime?.home !== undefined) {
      return d.score.fulltime;
    }
    return { home: m?.scoreHome ?? null, away: m?.scoreAway ?? null };
  }

  hasScore(): boolean {
    const s = this.displayScore();
    return s.home !== null && s.away !== null;
  }

  goalScorers(team: 'home' | 'away'): GoalEvent[] {
    return (this.details()?.goals ?? []).filter((g) => g.team === team);
  }
}
