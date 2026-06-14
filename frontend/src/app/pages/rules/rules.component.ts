import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StandingsService } from '../../core/standings.service';
import { PotCardComponent } from '../dashboard/components/pot-card/pot-card.component';
import { RulesCardComponent } from '../dashboard/components/rules-card/rules-card.component';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, PotCardComponent, RulesCardComponent],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.scss',
})
export class RulesComponent implements OnInit {
  paidCount = signal(0);
  loading = signal(true);

  constructor(private standingsService: StandingsService) {}

  ngOnInit() {
    this.standingsService.getLeaderboard().subscribe({
      next: (lb) => { this.paidCount.set(lb.ranked.length); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
