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
}
