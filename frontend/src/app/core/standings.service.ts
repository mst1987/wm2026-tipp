import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Standing {
  rank: number;
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  hasPaid: boolean;
  totalPoints: number;
  tipsCount: number;
  awardedTips: number;
}

@Injectable({ providedIn: 'root' })
export class StandingsService {
  constructor(private http: HttpClient) {}

  getLeaderboard() {
    return this.http.get<Standing[]>(`${environment.apiUrl}/standings`);
  }
}
