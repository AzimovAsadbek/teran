import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SessionService } from './session.service.js';

/**
 * Resolves the session cookie once per request and exposes it as `request.auth`. A cookie whose
 * session has expired or was revoked is cleared, so the browser stops presenting a dead token and
 * the storefront shows the signed-out state straight away.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      request.auth = await this.sessions.resolve(request);
      if (!request.auth && this.sessions.hasToken(request)) this.sessions.clearCookie(response);
      next();
    } catch (error) {
      next(error);
    }
  }
}
