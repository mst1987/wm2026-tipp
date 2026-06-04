import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  menuOpen = false;

  constructor(public auth: AuthService) {}

  ngOnInit() {
    if (this.auth.isLoggedIn && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe();
    }
  }
}
