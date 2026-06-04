import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface GoalEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  player: string;
  assist: string | null;
  detail: string;
  isOwnGoal: boolean;
  isPenalty: boolean;
}

export interface CardEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  player: string;
  card: 'yellow' | 'red';
}

export interface SubEvent {
  minute: number;
  extra: number | null;
  team: 'home' | 'away';
  playerIn: string;
  playerOut: string;
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
}

export interface TeamLineup {
  teamName: string;
  formation: string | null;
  coach: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchDetails {
  available: boolean;
  message?: string;
  venue?: string | null;
  referee?: string | null;
  status?: string;
  elapsed?: number | null;
  homeTeam?: { name: string; logo: string | null };
  awayTeam?: { name: string; logo: string | null };
  score?: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  goals?: GoalEvent[];
  cards?: CardEvent[];
  substitutions?: SubEvent[];
  lineups?: { home: TeamLineup | null; away: TeamLineup | null };
}

@Injectable({ providedIn: 'root' })
export class MatchDetailsService {
  constructor(private http: HttpClient) {}

  getDetails(matchId: string) {
    return this.http.get<MatchDetails>(`${environment.apiUrl}/matches/${matchId}/details`);
  }

  getMatch(matchId: string) {
    return this.http.get<any>(`${environment.apiUrl}/matches/${matchId}`);
  }
}
