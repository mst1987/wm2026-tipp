import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GroupData, GroupsService, TeamStats } from '../../core/groups.service';

const GROUP_COLORS: Record<string, string> = {
  A: '#e74c3c', B: '#e67e22', C: '#f1c40f', D: '#2ecc71',
  E: '#1abc9c', F: '#3498db', G: '#9b59b6', H: '#e91e63',
  I: '#ff5722', J: '#8bc34a', K: '#00bcd4', L: '#ff9800',
};

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
})
export class GroupsComponent implements OnInit {
  groups = signal<Record<string, GroupData>>({});
  groupKeys = signal<string[]>([]);
  activeGroup = signal<string>('');
  loading = signal(true);

  constructor(private groupsService: GroupsService) {}

  ngOnInit() {
    this.groupsService.getGroupTables().subscribe({
      next: (data) => {
        this.groups.set(data);
        const keys = Object.keys(data).sort();
        this.groupKeys.set(keys);
        if (keys.length) this.activeGroup.set(keys[0]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get activeData(): GroupData | null {
    return this.groups()[this.activeGroup()] ?? null;
  }

  /** Teams die gerade in einem laufenden Spiel dieser Gruppe sind */
  liveTeams(data: GroupData): Set<string> {
    const teams = new Set<string>();
    for (const day of data.matchdays) {
      for (const m of day.matches) {
        if (m.status === 'LIVE') {
          teams.add(m.teamHome);
          teams.add(m.teamAway);
        }
      }
    }
    return teams;
  }

  hasLiveMatches(data: GroupData): boolean {
    return data.matchdays.some((d) => d.matches.some((m) => m.status === 'LIVE'));
  }

  groupColor(group: string): string {
    return GROUP_COLORS[group] ?? '#58a6ff';
  }

  rankIndicator(stats: TeamStats, table: TeamStats[]): 'qualify' | 'thirdplace' | '' {
    const idx = table.indexOf(stats);
    if (idx < 2) return 'qualify';
    if (idx === 2) return 'thirdplace';
    return '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  statusLabel(status: string): string {
    return { SCHEDULED: '–', LIVE: 'LIVE', FINISHED: 'FT', POSTPONED: 'VERSCHOBEN', CANCELLED: 'ABGESAGT' }[status] ?? status;
  }
}
