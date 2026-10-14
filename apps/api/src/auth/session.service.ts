import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isStaffRole, type UserRole } from '@teran/contracts';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { clearCookieOptions, cookieName, cookieOptions } from '../common/cookies.js';
import { generateToken, sha256 } from '../common/crypto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RequestAuth } from './auth.types.js';

const HOUR_MS = 60 * 60 * 1000;
/** lastSeenAt is refreshed at most this often, so authenticated requests don't all write. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class SessionService {
  private readonly secure: boolean;
  readonly cookie: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.secure = config.get('COOKIE_SECURE', { infer: true });
    this.cookie = cookieName('teran_session', this.secure);
  }

  private ttlMs(role: UserRole): number {
    return isStaffRole(role)
      ? this.config.get('STAFF_SESSION_TTL_HOURS', { infer: true }) * HOUR_MS
      : this.config.get('SESSION_TTL_DAYS', { infer: true }) * 24 * HOUR_MS;
  }

  /** Starts a fresh session (new token on every login prevents session fixation). */
  async create(
    userId: string,
    role: UserRole,
    request: Request,
    response: Response,
  ): Promise<void> {
    const token = generateToken();
    const ttl = this.ttlMs(role);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttl),
        ipAddress: request.ip ?? null,
        userAgent: request.headers['user-agent']?.slice(0, 300) ?? null,
      },
    });
    response.cookie(this.cookie, token, cookieOptions(this.secure, ttl));
  }

  /** Resolves the session cookie into an active, non-expired session of an active user. */
  async resolve(request: Request): Promise<RequestAuth | null> {
    const token: unknown = request.cookies?.[this.cookie];
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;

    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const { user } = session;
    return {
      userId: user.id,
      sessionId: session.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
    };
  }

  /** The request presents a session cookie (valid or not). */
  hasToken(request: Request): boolean {
    return typeof request.cookies?.[this.cookie] === 'string';
  }

  clearCookie(response: Response): void {
    response.clearCookie(this.cookie, clearCookieOptions(this.secure));
  }

  /** Active sessions of a user, newest activity first (for the account's security page). */
  listForUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true },
    });
  }

  /** Signs out every other device of a user; the current session stays. */
  async destroyOthers(userId: string, keepSessionId: string): Promise<number> {
    const removed = await this.prisma.session.deleteMany({
      where: { userId, id: { not: keepSessionId } },
    });
    return removed.count;
  }

  async destroy(sessionId: string | undefined, response: Response): Promise<void> {
    if (sessionId) {
      await this.prisma.session.deleteMany({ where: { id: sessionId } });
    }
    response.clearCookie(this.cookie, clearCookieOptions(this.secure));
  }

  /**
   * Signs a user out everywhere: password change or reset, staff deactivation, and changes made
   * with the admin CLI. Role changes need no sign-out because the role is read on every request.
   */
  async destroyAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
