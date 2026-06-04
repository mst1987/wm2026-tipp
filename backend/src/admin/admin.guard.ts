import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'devihra';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.username === ADMIN_USERNAME) return true;
    throw new ForbiddenException('Kein Zugriff');
  }
}
