import { randomInt, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  normalizeUzPhone,
  type ChallengeDto,
  type ConnectedMethodsDto,
  type TelegramChallengeStatus,
  type VerificationStart,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import type { AuthChallenge, Prisma, User } from '../generated/prisma/client.js';
import { generateToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import {
  IdentityContext,
  codeLifetime,
  invalidCode,
  limited,
  linkingRequired,
  personalAction,
  resendDelay,
  unavailable,
} from './identity-context.js';
import { IdentityProviders } from './identity-providers.js';
import { verificationEmail } from './verification-copy.js';

type Tx = Prisma.TransactionClient;
const digits = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
const taken = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';

@Injectable()
export class VerificationService {
  constructor(
    private readonly db: PrismaService,
    private readonly ctx: IdentityContext,
    private readonly auth: AuthService,
    private readonly mail: MailService,
    private readonly providers: IdentityProviders,
  ) {}
  async start(input: VerificationStart, req: Request, res: Response): Promise<ChallengeDto> {
    if (input.channel === 'EMAIL' ? !this.mail.canDeliverCodes : !this.providers.telegram)
      throw unavailable();
    const actor = personalAction(input.purpose) ? await this.ctx.fresh(req) : null;
    const browserHash = this.ctx.browser(req, res);
    const person = input.purpose === 'REGISTER' ? input.profile : undefined;
    const email = 'email' in input ? input.email : person?.email;
    const phone = input.purpose === 'PHONE_CHANGE' ? input.phone : person?.phone;
    const scope = this.ctx.derive(
      'code-scope',
      input.channel,
      input.channel === 'EMAIL' ? email! : (actor?.userId ?? browserHash),
    );
    const code = input.channel === 'EMAIL' ? digits() : null;
    const link = input.channel === 'TELEGRAM' ? generateToken() : null;
    const id = randomUUID(),
      now = Date.now();
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))`;
      const history = await tx.authChallenge.findMany({
        where: { scope, createdAt: { gt: new Date(now - 3600_000) } },
        select: { createdAt: true, purpose: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      if (
        history.length >= 6 ||
        history.some(
          (h) => h.purpose === input.purpose && h.createdAt.getTime() > now - resendDelay,
        )
      )
        throw limited();
      await tx.authChallenge.updateMany({
        where: { scope, consumedAt: null },
        data: { consumedAt: new Date(now), codeHash: null, linkHash: null },
      });
      await tx.authChallenge.create({
        data: {
          id,
          browserHash,
          scope,
          userId: actor?.userId,
          sessionId: actor?.sessionId,
          channel: input.channel,
          purpose: input.purpose,
          email,
          phone,
          firstName: person?.firstName,
          lastName: person?.lastName,
          locale: input.locale,
          expiresAt: new Date(now + codeLifetime),
          codeHash: code ? this.ctx.derive('otp', id, code) : null,
          linkHash: link ? sha256(link) : null,
        },
      });
    });
    if (code && email) {
      const message = verificationEmail(
        email,
        input.locale,
        code,
        this.ctx.path(input.locale, '/contact'),
      );
      if (input.purpose === 'LOGIN') {
        // Reply before checking the account or contacting SMTP. Unknown and disabled accounts get
        // the same challenge shape and response time, without mailing an unsolicited sign-in code.
        void this.sendLoginCode(id, email, message);
      } else {
        try {
          await this.mail.send(message);
        } catch {
          await this.invalidate(id);
          throw unavailable();
        }
      }
    }
    return {
      id,
      expiresAt: new Date(now + codeLifetime).toISOString(),
      resendAt: new Date(now + resendDelay).toISOString(),
      ...(link ? { telegramUrl: this.providers.telegramLink(link) } : {}),
    };
  }
  private async sendLoginCode(
    id: string,
    email: string,
    message: ReturnType<typeof verificationEmail>,
  ) {
    try {
      const user = await this.db.user.findFirst({
        where: { email, emailVerifiedAt: { not: null }, isActive: true, role: 'CUSTOMER' },
        select: { id: true },
      });
      if (user) await this.mail.send(message);
    } catch {
      await this.invalidate(id).catch(() => {});
    }
  }
  private async invalidate(id: string) {
    await this.db.authChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date(), codeHash: null, linkHash: null },
    });
  }
  async telegramStatus(id: string, req: Request): Promise<TelegramChallengeStatus> {
    const row = await this.db.authChallenge.findFirst({
      where: { id, channel: 'TELEGRAM', browserHash: this.ctx.browser(req) },
      select: { consumedAt: true, expiresAt: true, subject: true },
    });
    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) return { state: 'ended' };
    return { state: row.subject ? 'opened' : 'waiting' };
  }
  async telegramStart(link: string, subject: string) {
    const code = digits();
    const row = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'telegram:' + subject}, 0))`;
      const item = await tx.authChallenge.findFirst({
        where: {
          channel: 'TELEGRAM',
          linkHash: sha256(link),
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!item) return null;
      const recent = await tx.authChallenge.findMany({
        where: { channel: 'TELEGRAM', subject, createdAt: { gt: new Date(Date.now() - 3600_000) } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, purpose: true },
        take: 6,
      });
      if (
        recent.length >= 6 ||
        recent.some(
          (h) => h.purpose === item.purpose && h.createdAt.getTime() > Date.now() - resendDelay,
        )
      )
        return null;
      await tx.authChallenge.updateMany({
        where: { channel: 'TELEGRAM', subject, consumedAt: null },
        data: { consumedAt: new Date(), codeHash: null, linkHash: null },
      });
      const bound = await tx.authChallenge.updateMany({
        where: {
          id: item.id,
          linkHash: sha256(link),
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          linkHash: null,
          subject,
          codeHash: item.purpose === 'PHONE_CHANGE' ? null : this.ctx.derive('otp', item.id, code),
        },
      });
      return bound.count ? item : null;
    });
    if (row) {
      try {
        await this.providers.telegramMessage(
          subject,
          row.locale,
          row.purpose === 'PHONE_CHANGE' ? undefined : code,
        );
      } catch {
        await this.invalidate(row.id);
      }
    }
  }
  async telegramContact(subject: string, phone: string) {
    const normalized = normalizeUzPhone(phone);
    if (!normalized) return;
    const row = await this.db.authChallenge.findFirst({
      where: {
        purpose: 'PHONE_CHANGE',
        channel: 'TELEGRAM',
        subject,
        phone: normalized,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        codeHash: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return;
    const code = digits();
    const sent = await this.db.authChallenge.updateMany({
      where: { id: row.id, codeHash: null, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { codeHash: this.ctx.derive('otp', row.id, code) },
    });
    if (sent.count) {
      try {
        await this.providers.telegramMessage(subject, row.locale, code);
      } catch {
        await this.invalidate(row.id);
      }
    }
  }
  async verify(id: string, code: string, req: Request, res: Response) {
    const browserHash = this.ctx.browser(req);
    const digest = this.ctx.derive('otp', id, code);
    const row = await this.db.authChallenge.findFirst({
      where: {
        id,
        browserHash,
        channel: { in: ['EMAIL', 'TELEGRAM'] },
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) throw invalidCode();
    if (personalAction(row.purpose)) {
      const actor = await this.ctx.fresh(req);
      if (actor.userId !== row.userId || actor.sessionId !== row.sessionId) throw invalidCode();
    }
    let user: User | null;
    try {
      user = await this.db.$transaction(async (tx) => {
        const where = {
          id,
          browserHash,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        };
        const won = await tx.authChallenge.updateMany({
          where: { ...where, codeHash: digest },
          data: { codeHash: null, consumedAt: new Date() },
        });
        if (!won.count) {
          await tx.authChallenge.updateMany({
            where: { ...where, codeHash: { not: null } },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }
        return this.resolveVerified(tx, row);
      });
    } catch (err) {
      if (taken(err) || (err instanceof ApiException && err.code === 'CONFLICT')) {
        await this.invalidate(id);
        throw linkingRequired();
      }
      throw err;
    }
    if (!user) throw invalidCode();
    if (!personalAction(row.purpose)) await this.auth.signInVerified(req, res, user);
    return { accepted: true };
  }
  private async resolveVerified(tx: Tx, c: AuthChallenge): Promise<User | null> {
    const now = new Date();
    const match =
      c.channel === 'TELEGRAM' && c.subject
        ? await tx.authIdentity.findUnique({
            where: { provider_subject: { provider: 'TELEGRAM', subject: c.subject } },
            include: { user: true },
          })
        : null;
    if (c.purpose === 'LOGIN') {
      const user =
        c.channel === 'EMAIL' && c.email
          ? await tx.user.findFirst({ where: { email: c.email, emailVerifiedAt: { not: null } } })
          : match?.user;
      return user?.isActive && user.role === 'CUSTOMER' ? user : null;
    }
    if (c.purpose === 'REGISTER') {
      if (
        !c.firstName ||
        !c.lastName ||
        !c.email ||
        !c.phone ||
        (c.channel === 'TELEGRAM' && !c.subject)
      )
        return null;
      if (match || (await tx.user.findUnique({ where: { email: c.email }, select: { id: true } })))
        throw linkingRequired();
      return tx.user.create({
        data: {
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          locale: c.locale,
          role: 'CUSTOMER',
          ...(c.channel === 'EMAIL'
            ? { email: c.email, emailVerifiedAt: now }
            : {
                contactEmail: c.email,
                identities: { create: { provider: 'TELEGRAM', subject: c.subject! } },
              }),
        },
      });
    }
    if (!c.userId) return null;
    const user = await tx.user.findFirst({ where: { id: c.userId, isActive: true } });
    if (!user) return null;
    if (c.purpose === 'EMAIL_CHANGE' && c.email) {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { email: c.email, emailVerifiedAt: now, contactEmail: null },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: c.sessionId! } } });
      return updated;
    }
    if (c.purpose === 'PHONE_CHANGE' && c.subject && c.phone) {
      if (match && match.userId !== user.id) throw linkingRequired();
      return tx.user.update({
        where: { id: user.id },
        data: { phone: c.phone, phoneVerifiedAt: now },
      });
    }
    if (c.purpose === 'LINK' && c.subject) {
      if (match?.userId === user.id) return user;
      if (match) throw linkingRequired();
      await tx.authIdentity.create({
        data: { userId: user.id, provider: 'TELEGRAM', subject: c.subject },
      });
      return user;
    }
    return null;
  }
  async methods(userId: string): Promise<ConnectedMethodsDto> {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { identities: { select: { provider: true } } },
    });
    return {
      email: user.email ?? user.contactEmail,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      password: !!user.passwordHash,
      telegram: user.identities.some((i) => i.provider === 'TELEGRAM'),
      google: user.identities.some((i) => i.provider === 'GOOGLE'),
    };
  }
  async disconnect(provider: 'GOOGLE' | 'TELEGRAM', req: Request) {
    const actor = await this.ctx.fresh(req);
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'identities:' + actor.userId}, 0))`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.userId },
        include: { identities: true },
      });
      if (!user.identities.some((i) => i.provider === provider)) return;
      if (
        !user.passwordHash &&
        !(this.mail.canDeliverCodes && user.emailVerifiedAt) &&
        !user.identities.some(
          (i) =>
            i.provider !== provider &&
            (i.provider === 'GOOGLE' ? this.providers.google : this.providers.telegram),
        )
      )
        throw ApiException.conflict('CONFLICT', 'Keep one working sign-in method', {
          reason: 'last_method',
        });
      await tx.authIdentity.deleteMany({ where: { userId: actor.userId, provider } });
      await tx.session.deleteMany({
        where: { userId: actor.userId, id: { not: actor.sessionId } },
      });
    });
  }
}
