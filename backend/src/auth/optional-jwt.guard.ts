import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Wie AuthGuard('jwt'), wirft aber NICHT bei fehlendem/ungültigem Token.
 * req.user ist dann gesetzt (eingeloggt) oder undefined (Gast).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  handleRequest(err: any, user: any) {
    return user ?? null;
  }
}
