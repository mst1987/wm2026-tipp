import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn) return true;
  // Direkt zur Discord-Anmeldung statt zu einer Login-Seite
  auth.loginWithDiscord();
  return false;
};
