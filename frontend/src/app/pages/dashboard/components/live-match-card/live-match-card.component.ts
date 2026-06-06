import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Match } from '../../../../core/matches.service';
import { GoalEvent, MatchDetails } from '../../../../core/match-details.service';

@Component({
  selector: 'app-live-match-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './live-match-card.component.html',
  styleUrl: './live-match-card.component.scss',
})
export class LiveMatchCardComponent {
  @Input({ required: true }) match!: Match;
  @Input() details: MatchDetails | null = null;

  /** Letztes Tor (höchste Minute). */
  lastGoal(): GoalEvent | null {
    const goals = this.details?.goals;
    if (!goals?.length) return null;
    return [...goals].sort((a, b) => (b.minute - a.minute) || (b.extra ?? 0) - (a.extra ?? 0))[0];
  }

  goalTeamName(g: GoalEvent): string {
    return g.team === 'home' ? this.details?.homeTeam?.name ?? '' : this.details?.awayTeam?.name ?? '';
  }

  minuteLabel(minute: number, extra: number | null): string {
    return extra ? `${minute}+${extra}'` : `${minute}'`;
  }
}
