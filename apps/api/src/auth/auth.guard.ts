import {
  createParamDecorator,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@teran/contracts';
import type { Request } from 'express';
import { ApiException } from '../common/errors/api-exception.js';
import type { RequestAuth } from './auth.types.js';

const AUTH_METADATA = 'teran:auth';

interface AuthRequirement {
  roles?: readonly UserRole[];
}

/**
 * Marks a route as requiring a signed-in user, optionally with one of the given roles.
 * Authorization is always enforced here, on the server; hiding UI is never relied upon.
 */
export const RequireAuth = (requirement: AuthRequirement = {}) =>
  SetMetadata(AUTH_METADATA, requirement);

/** Shorthand for administration endpoints. */
export const RequireStaff = (roles: readonly UserRole[] = ['MANAGER', 'ADMIN']) =>
  RequireAuth({ roles });

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(
      AUTH_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) return true;

    const auth = context.switchToHttp().getRequest<Request>().auth;
    if (!auth) throw ApiException.unauthenticated();
    if (requirement.roles && !requirement.roles.includes(auth.role)) throw ApiException.forbidden();
    return true;
  }
}

/** Injects the authenticated principal; only use on routes protected by @RequireAuth. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAuth => {
    const auth = context.switchToHttp().getRequest<Request>().auth;
    if (!auth) throw ApiException.unauthenticated();
    return auth;
  },
);

/** Injects the principal when present (optional authentication). */
export const OptionalAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAuth | null =>
    context.switchToHttp().getRequest<Request>().auth ?? null,
);
