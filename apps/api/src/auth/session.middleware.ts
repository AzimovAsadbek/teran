import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SessionService } from './session.service.js';

/** Resolves the session cookie once per request and exposes it as `request.auth`. */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    try {
      request.auth = await this.sessions.resolve(request);
      next();
    } catch (error) {
      next(error);
    }
  }
}
