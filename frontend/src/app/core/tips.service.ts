import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Match } from './matches.service';

export interface Tip {
  id: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  points: number;
  pointsAwarded: boolean;
  match: Match;
}

@Injectable({ providedIn: 'root' })
export class TipsService {
  private base = `${environment.apiUrl}/tips`;

  constructor(private http: HttpClient) {}

  getMyTips() {
    return this.http.get<Tip[]>(this.base);
  }

  getTipsByUser(userId: string) {
    return this.http.get<Tip[]>(`${this.base}/user/${userId}`);
  }

  submitTip(matchId: string, predictedHome: number, predictedAway: number) {
    return this.http.post<Tip>(this.base, { matchId, predictedHome, predictedAway });
  }
}
