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

export interface Leaderboard {
  ranked: Standing[];
  unpaid: Standing[];
}

export interface LiveStanding {
  rank: number;
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  hasPaid: boolean;
  basePoints: number;
  livePoints: number;
  totalPoints: number;
}

export interface LiveLeaderboard {
  hasLive: boolean;
  entries: LiveStanding[];
}

@Injectable({ providedIn: 'root' })
export class StandingsService {
  constructor(private http: HttpClient) {}

  getLeaderboard() {
    return this.http.get<Leaderboard>(`${environment.apiUrl}/standings`);
  }

  getLiveLeaderboard() {
    return this.http.get<LiveLeaderboard>(`${environment.apiUrl}/standings/live`);
  }
}
