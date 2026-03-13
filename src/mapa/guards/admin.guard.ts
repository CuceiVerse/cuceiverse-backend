import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type AuthenticatedUser = {
  id: string;
  siiauCode: string;
  isAdmin: boolean;
};

/** Requires JwtAuthGuard to have already validated the token. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Se requiere rol de administrador');
    }

    return true;
  }
}
