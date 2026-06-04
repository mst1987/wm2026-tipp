import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface KnockoutMatch {
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
}

export interface KnockoutStage {
  stage: string;
  label: string;
  matches: KnockoutMatch[];
}

@Injectable({ providedIn: 'root' })
export class KnockoutService {
  constructor(private http: HttpClient) {}

  getKnockoutStages() {
    return this.http.get<KnockoutStage[]>(`${environment.apiUrl}/knockout`);
  }
}
