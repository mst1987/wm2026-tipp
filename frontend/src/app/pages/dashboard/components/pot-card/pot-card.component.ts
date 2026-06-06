import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const STAKE_PER_PLAYER = 200; // g auf Thunderstrike

@Component({
  selector: 'app-pot-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pot-card.component.html',
  styleUrl: './pot-card.component.scss',
})
export class PotCardComponent {
  @Input() paidCount = 0;

  get potTotal(): number {
    return this.paidCount * STAKE_PER_PLAYER;
  }

  potShare(percent: number): number {
    return Math.round((this.potTotal * percent) / 100);
  }
}
