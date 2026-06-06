import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Match } from '../../../../core/matches.service';

@Component({
  selector: 'app-upcoming-matches',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './upcoming-matches.component.html',
  styleUrl: './upcoming-matches.component.scss',
})
export class UpcomingMatchesComponent {
  @Input() matches: Match[] = [];

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
