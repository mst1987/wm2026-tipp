import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  hasPaid: boolean;
  tips: { points: number; pointsAwarded: boolean }[];
}

export interface ApiStatus {
  configured: boolean;
  lastCallAt: string | null;
  callsToday: number;
  dailyLimit: number;
  lastSyncAt: string | null;
  syncedMatches: number;
  totalMatches: number;
  isSyncing: boolean;
}

export interface SyncResult {
  synced: number;
  skipped: string | null;
  status: ApiStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get<AdminUser[]>(`${this.base}/users`);
  }

  togglePayment(userId: string) {
    return this.http.patch<AdminUser>(`${this.base}/users/${userId}/payment`, {});
  }

  deleteUser(userId: string) {
    return this.http.delete(`${this.base}/users/${userId}`);
  }

  getApiStatus() {
    return this.http.get<ApiStatus>(`${this.base}/api-status`);
  }

  syncDetails() {
    return this.http.post<SyncResult>(`${this.base}/sync-details`, {});
  }
}
