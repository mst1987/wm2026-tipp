import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface TeamStats {
  team: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupMatch {
  id: string;
  matchDate: string;
  teamHome: string;
  teamAway: string;
  teamHomeLogo: string | null;
  teamAwayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
}

export interface GroupMatchday {
  number: number;
  matches: GroupMatch[];
}

export interface GroupData {
  table: TeamStats[];
  matchdays: GroupMatchday[];
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  constructor(private http: HttpClient) {}

  getGroupTables() {
    return this.http.get<Record<string, GroupData>>(`${environment.apiUrl}/groups`);
  }
}
