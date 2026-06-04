import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Match {
  id: string;
  externalId: number | null;
  matchDate: string;
  teamHome: string;
  teamAway: string;
  teamHomeLogo: string | null;
  teamAwayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  stage: string;
  group: string | null;
}

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private base = `${environment.apiUrl}/matches`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Match[]>(this.base);
  }

  getUpcoming() {
    return this.http.get<Match[]>(`${this.base}/upcoming`);
  }
}
