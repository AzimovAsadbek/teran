import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Locale } from '@teran/contracts';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { cookieName, cookieOptions } from '../common/cookies.js';
import { generateToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const codeLifetime = 5 * 60_000;
export const resendDelay = 60_000;
export const invalidCode = () =>
  ApiException.badRequest('INVALID_CREDENTIALS', 'Verification code is invalid or expired');
export const limited = () => new ApiException(429, 'RATE_LIMITED', 'Try again later');
export const unavailable = () =>
  new ApiException(503, 'SERVICE_UNAVAILABLE', 'This sign-in method is unavailable');
export const linkingRequired = () =>
  ApiException.conflict(
    'CONFLICT',
    'Sign in with your existing method and connect the new method in settings',
  );
export const personalAction = (purpose: string) =>
  ['LINK', 'EMAIL_CHANGE', 'PHONE_CHANGE'].includes(purpose);

@Injectable()
export class IdentityContext {
  constructor(
    readonly settings: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}
  get origin() {
    return new URL(this.settings.get('WEB_ORIGIN', { infer: true })).origin;
  }
  path(locale: Locale, path: string) {
    return this.origin + (locale === 'uz' ? '' : '/' + locale) + path;
  }
  safePath(value: string | undefined) {
    if (
      !value ||
      value.length > 300 ||
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\') ||
      Array.from(value).some((char) => char.charCodeAt(0) <= 32)
    )
      return '/account';
    return value;
  }
  derive(label: string, ...fields: string[]) {
    return createHmac('sha256', this.settings.get('APP_SECRET', { infer: true }))
      .update(JSON.stringify([label, ...fields]))
      .digest('hex');
  }
  browser(req: Request, res?: Response): string {
    const secure = this.settings.get('COOKIE_SECURE', { infer: true });
    const key = cookieName('teran_auth_flow', secure);
    const value: unknown = req.cookies?.[key];
    if (typeof value === 'string' && /^[\w-]{43}$/.test(value)) return sha256(value);
    if (!res) throw invalidCode();
    const fresh = generateToken();
    res.cookie(key, fresh, cookieOptions(secure, 30 * 60_000));
    return sha256(fresh);
  }
  async fresh(req: Request) {
    if (!req.auth) throw ApiException.unauthenticated();
    const session = await this.prisma.session.findFirst({
      where: {
        id: req.auth.sessionId,
        userId: req.auth.userId,
        expiresAt: { gt: new Date() },
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
      },
    });
    if (!session)
      throw new ApiException(403, 'FORBIDDEN', 'Sign in again to change account security', {
        details: { reason: 'reauth' },
      });
    return req.auth;
  }
}
