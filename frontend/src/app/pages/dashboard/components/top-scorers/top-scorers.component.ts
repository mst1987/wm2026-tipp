import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScorerEntry } from '../../../../core/matches.service';

@Component({
  selector: 'app-top-scorers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-scorers.component.html',
  styleUrl: './top-scorers.component.scss',
})
export class TopScorersComponent {
  @Input() scorers: ScorerEntry[] = [];
}
