import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'wm2026_token';

  currentUser = signal<User | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  loginWithDiscord() {
    window.location.href = `${environment.apiUrl}/auth/discord`;
  }

  handleCallback(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.loadCurrentUser().subscribe({
      next: () => this.router.navigate(['/matches']),
      error: () => { this.logout(); },
    });
  }

  loadCurrentUser() {
    this.isLoading.set(true);
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap({
        next: (user) => { this.currentUser.set(user); this.isLoading.set(false); },
        error: () => { this.currentUser.set(null); this.isLoading.set(false); },
      }),
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  avatarUrl(user: User): string {
    if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/0.png`;
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
  }
}
