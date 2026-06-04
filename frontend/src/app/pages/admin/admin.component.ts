import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminUser } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';

const ADMIN_USERNAME = 'devihra';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  users = signal<AdminUser[]>([]);
  loading = signal(true);
  confirmDelete = signal<string | null>(null);

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
  }

  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
