import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Match } from './matches.service';

export interface Tip {
  id: string;
  matchId: string;
  predictedHome: number | null;
  predictedAway: number | null;
  points: number;
  pointsAwarded: boolean;
  hidden?: boolean;
  match: Match;
}

export interface MatchTip {
  userId: string;
  username: string;
  avatar: string | null;
  discordId: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null;
}

export interface MatchTips {
  visible: boolean;
  tips: MatchTip[];
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

  getMatchTips(matchId: string) {
    return this.http.get<MatchTips>(`${this.base}/match/${matchId}`);
  }

  submitTip(matchId: string, predictedHome: number, predictedAway: number) {
    return this.http.post<Tip>(this.base, { matchId, predictedHome, predictedAway });
  }
}
