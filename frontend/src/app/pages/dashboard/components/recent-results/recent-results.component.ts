import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Match } from '../../../../core/matches.service';

@Component({
  selector: 'app-recent-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recent-results.component.html',
  styleUrl: './recent-results.component.scss',
})
export class RecentResultsComponent {
  @Input() matches: Match[] = [];

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
  }

  normalizeGroup(group: string | null): string {
    return group ? group.replace('GROUP_', '') : '';
  }
}
