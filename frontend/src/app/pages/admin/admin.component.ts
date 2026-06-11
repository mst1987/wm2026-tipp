import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminUser, ApiStatus } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';

const ADMIN_USERNAME = 'devihra';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  users = signal<AdminUser[]>([]);
  loading = signal(true);
  confirmDelete = signal<string | null>(null);

  apiStatus = signal<ApiStatus | null>(null);
  syncing = signal(false);
  syncMessage = signal<string | null>(null);
  private clockTimer?: ReturnType<typeof setInterval>;
  now = signal(Date.now());

  constructor(
    public auth: AuthService,
    private adminService: AdminService,
  ) {}

  get isAdmin(): boolean {
    return this.auth.currentUser()?.username === ADMIN_USERNAME;
  }

  ngOnInit() {
    if (!this.isAdmin) return;
    this.loadUsers();
    this.loadApiStatus();
    // Uhr für "vor X Minuten" jede Sekunde aktualisieren
    this.clockTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadApiStatus() {
    this.adminService.getApiStatus().subscribe({
      next: (s) => this.apiStatus.set(s),
    });
  }

  runSync() {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.syncMessage.set(null);
    this.adminService.syncDetails().subscribe({
      next: (res) => {
        this.apiStatus.set(res.status);
        this.syncMessage.set(
          res.skipped
            ? `Übersprungen: ${res.skipped}`
            : `✓ ${res.synced} Spiel${res.synced === 1 ? '' : 'e'} aktualisiert.`,
        );
        this.syncing.set(false);
      },
      error: () => {
        this.syncMessage.set('Fehler beim Synchronisieren.');
        this.syncing.set(false);
      },
    });
  }

  recalculating = signal(false);
  recalcMessage = signal<string | null>(null);

  recalcPoints() {
    if (this.recalculating()) return;
    this.recalculating.set(true);
    this.recalcMessage.set(null);
    this.adminService.recalculatePoints().subscribe({
      next: (res) => {
        this.recalcMessage.set(
          `✓ ${res.updatedTips} Tipp${res.updatedTips === 1 ? '' : 's'} aus ${res.matches} Spiel${res.matches === 1 ? '' : 'en'} neu berechnet.`,
        );
        this.recalculating.set(false);
      },
      error: () => {
        this.recalcMessage.set('Fehler bei der Neuberechnung.');
        this.recalculating.set(false);
      },
    });
  }

  /** "vor X Minuten/Sekunden/Stunden" – reaktiv über now(). */
  timeAgo(iso: string | null): string {
    if (!iso) return 'nie';
    const diff = Math.max(0, this.now() - new Date(iso).getTime());
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `vor ${sec} Sek.`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `vor ${min} Min.`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `vor ${hrs} Std. ${min % 60} Min.`;
    const days = Math.floor(hrs / 24);
    return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  }

  callsPercent(): number {
    const s = this.apiStatus();
    if (!s) return 0;
    return Math.min(100, Math.round((s.callsToday / s.dailyLimit) * 100));
  }

  callsClass(): string {
    const p = this.callsPercent();
    if (p >= 90) return 'danger';
    if (p >= 70) return 'warn';
    return 'ok';
  }

  togglePayment(user: AdminUser) {
    this.adminService.togglePayment(user.id).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? { ...u, hasPaid: updated.hasPaid } : u)),
        );
      },
    });
  }

  askDelete(userId: string) {
    this.confirmDelete.set(userId);
  }

  cancelDelete() {
    this.confirmDelete.set(null);
  }

  confirmDeleteUser(userId: string) {
    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== userId));
        this.confirmDelete.set(null);
      },
    });
  }

  get paidCount(): number {
    return this.users().filter((u) => u.hasPaid).length;
  }

  get unpaidCount(): number {
    return this.users().filter((u) => !u.hasPaid).length;
  }

  totalPoints(user: AdminUser): number {
    return user.tips.reduce((s, t) => s + t.points, 0);
  }

  avatarUrl(user: AdminUser): string {
    if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
}
