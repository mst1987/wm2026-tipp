import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'matches',
        loadComponent: () =>
          import('./pages/matches/matches.component').then(
            (m) => m.MatchesComponent,
          ),
      },
      {
        path: 'matches/:id',
        loadComponent: () =>
          import('./pages/match-detail/match-detail.component').then(
            (m) => m.MatchDetailComponent,
          ),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./pages/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'knockout',
        loadComponent: () =>
          import('./pages/knockout/knockout.component').then(
            (m) => m.KnockoutComponent,
          ),
      },
      {
        path: 'rules',
        loadComponent: () =>
          import('./pages/rules/rules.component').then((m) => m.RulesComponent),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./pages/groups/groups.component').then(
            (m) => m.GroupsComponent,
          ),
      },
      {
        path: 'standings',
        loadComponent: () =>
          import('./pages/standings/standings.component').then(
            (m) => m.StandingsComponent,
          ),
      },
      {
        path: 'standings/:userId',
        loadComponent: () =>
          import('./pages/player-tips/player-tips.component').then(
            (m) => m.PlayerTipsComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
