import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  MAX_LINE_QUANTITY,
  isStaffRole,
  type AuthFeaturesDto,
  type CurrentUserDto,
  type Locale,
  type LoginInput,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import type { User } from '../generated/prisma/client.js';
import { generateToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CartService } from '../cart/cart.service.js';
import { MailService } from '../mail/mail.service.js';
import { passwordResetEmail } from '../mail/templates.js';
import { hashPassword, timingSafeDummyHash, verifyPassword } from './password.js';
import { SessionService } from './session.service.js';

const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_MINUTES = 60;

export function toCurrentUser(user: User): CurrentUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    locale: user.locale,
  };
}

const invalidCredentials = () =>
  new ApiException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid e-mail or password');

/**
 * Same status, code and message as IP rate limiting, so the response does not single out a locked
 * account. (Whether an e-mail is registered is not secret: registration reports EMAIL_TAKEN.)
 */
const tooManyAttempts = () =>
  new ApiException(
    HttpStatus.TOO_MANY_REQUESTS,
    'RATE_LIMITED',
    'Too many requests, please try again later',
  );

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly cart: CartService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  features(): AuthFeaturesDto {
    return { passwordReset: this.mail.isEnabled, registration: true };
  }

  async register(
    request: Request,
    response: Response,
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      phone?: string;
      locale: Locale;
    },
  ): Promise<CurrentUserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw ApiException.conflict('EMAIL_TAKEN', 'An account with this e-mail already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        locale: input.locale,
        role: 'CUSTOMER',
      },
    });
    // A browser that was signed in to another account starts clean, as on login.
    if (request.auth) {
      await this.sessions.destroy(request.auth.sessionId, response);
    }
    await this.startSession(request, response, user);
    return toCurrentUser(user);
  }

  async login(request: Request, response: Response, input: LoginInput): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      // Spend the same time as a real verification so unknown e-mails are not detectable.
      await verifyPassword(await timingSafeDummyHash(), input.password);
      throw invalidCredentials();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      // Verify anyway (the result is ignored) so a locked account answers as slowly as any other.
      await verifyPassword(user.passwordHash, input.password);
      throw tooManyAttempts();
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid || !user.isActive) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
      });
      if (updated.failedLoginCount >= LOCK_THRESHOLD) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
        });
        this.logger.warn(
          { userId: user.id },
          'Account temporarily locked after repeated failed logins',
        );
      }
      throw invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    if (request.auth) {
      await this.sessions.destroy(request.auth.sessionId, response);
    }
    await this.startSession(request, response, user);
    if (isStaffRole(user.role)) {
      await this.audit.record({
        actorUserId: user.id,
        action: 'auth.staff_login',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.ip ?? null,
      });
    }
    return toCurrentUser(user);
  }

  async logout(request: Request, response: Response): Promise<void> {
    await this.sessions.destroy(request.auth?.sessionId, response);
    // The cart stays attached to the account; drop it from this (possibly shared) device.
    this.cart.clearCookie(response);
  }

  async updateProfile(
    userId: string,
    input: { firstName: string; lastName?: string; phone?: string; locale: Locale },
  ): Promise<CurrentUserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        locale: input.locale,
      },
    });
    return toCurrentUser(user);
  }

  async changePassword(
    request: Request,
    response: Response,
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw invalidCredentials();
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
    // Sign out every other device, then continue this one with a fresh session.
    await this.sessions.destroyAllForUser(userId);
    await this.sessions.create(user.id, user.role, request, response);
  }

  async requestPasswordReset(email: string, locale: Locale): Promise<void> {
    if (!this.mail.isEnabled) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'FEATURE_DISABLED',
        'Password reset is not available',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });
    // Same response, and the same response time, whether or not the account exists: the token
    // and the e-mail are produced after the response has been sent.
    if (!user || !user.isActive) return;
    void this.issuePasswordReset(user, locale);
  }

  private async issuePasswordReset(
    user: { id: string; email: string },
    locale: Locale,
  ): Promise<void> {
    try {
      const token = generateToken();
      await this.prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: sha256(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
          },
        });
      });
      const link = this.mail.webUrl(
        locale,
        `/account/reset-password?token=${encodeURIComponent(token)}`,
      );
      await this.mail.send({
        to: user.email,
        ...passwordResetEmail(locale, { link, minutes: RESET_TOKEN_MINUTES }),
      });
    } catch (error) {
      this.logger.error({ err: error, userId: user.id }, 'Password reset could not be issued');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw ApiException.badRequest('INVALID_TOKEN', 'This link is invalid or has expired');
    }
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      // Consuming the token conditionally makes a link usable exactly once, even under races.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw ApiException.badRequest('INVALID_TOKEN', 'This link is invalid or has expired');
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      // Whoever knew the old password is signed out everywhere.
      await tx.session.deleteMany({ where: { userId: record.userId } });
    });
  }

  private async startSession(request: Request, response: Response, user: User): Promise<void> {
    await this.sessions.create(user.id, user.role, request, response);
    await this.attachCart(request, response, user.id);
  }

  /**
   * Keeps one cart per customer: the cart on this device is attached to the account and merged
   * with any cart left from an earlier visit; without a device cart, the account's cart is restored.
   */
  private async attachCart(request: Request, response: Response, userId: string): Promise<void> {
    const deviceCart = await this.cart.findCart(request);
    const accountCart = await this.prisma.cart.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        ...(deviceCart ? { id: { not: deviceCart.id } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { items: true },
    });

    if (!deviceCart) {
      if (accountCart) await this.cart.adoptCart(accountCart.id, response);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cart.update({ where: { id: deviceCart.id }, data: { userId } });
      if (!accountCart) return;
      for (const item of accountCart.items) {
        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: deviceCart.id, variantId: item.variantId } },
        });
        const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_LINE_QUANTITY);
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: deviceCart.id, variantId: item.variantId } },
          create: { cartId: deviceCart.id, variantId: item.variantId, quantity },
          update: { quantity },
        });
      }
      await tx.cart.delete({ where: { id: accountCart.id } });
    });
  }
}
