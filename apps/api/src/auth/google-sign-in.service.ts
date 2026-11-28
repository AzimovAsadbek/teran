import { Injectable } from '@nestjs/common';
import type { Locale } from '@teran/contracts';
import type { Request, Response } from 'express';
import { generateToken, sha256 } from '../common/crypto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { IdentityContext, invalidCode, linkingRequired, unavailable } from './identity-context.js';
import { IdentityProviders } from './identity-providers.js';

@Injectable()
export class GoogleSignInService {
  constructor(
    private readonly db: PrismaService,
    private readonly ctx: IdentityContext,
    private readonly providers: IdentityProviders,
    private readonly auth: AuthService,
  ) {}
  async start(
    input: { purpose: 'LOGIN' | 'LINK'; locale: Locale; next?: string },
    req: Request,
    res: Response,
  ) {
    if (!this.providers.google) throw unavailable();
    const actor = input.purpose === 'LINK' ? await this.ctx.fresh(req) : null;
    const browserHash = this.ctx.browser(req, res),
      state = generateToken();
    await this.db.authChallenge.create({
      data: {
        channel: 'GOOGLE',
        purpose: input.purpose,
        linkHash: sha256(state),
        browserHash,
        scope: browserHash,
        sessionId: actor?.sessionId,
        userId: actor?.userId,
        locale: input.locale,
        nextPath: this.ctx.safePath(input.next),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    return { url: this.providers.googleUrl(state, browserHash) };
  }
  async callback(
    query: { state?: string; code?: string; error?: string },
    req: Request,
    res: Response,
  ) {
    const state = query.state;
    if (!state || !/^[\w-]{43}$/.test(state)) throw invalidCode();
    const browserHash = this.ctx.browser(req);
    const c = await this.db.authChallenge.findFirst({
      where: {
        channel: 'GOOGLE',
        linkHash: sha256(state),
        browserHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!c) throw invalidCode();
    const used = await this.db.authChallenge.updateMany({
      where: { id: c.id, linkHash: sha256(state), consumedAt: null, expiresAt: { gt: new Date() } },
      data: { linkHash: null, consumedAt: new Date() },
    });
    if (!used.count) throw invalidCode();
    const fail = (why: string) =>
      this.ctx.path(
        c.locale,
        (c.purpose === 'LINK' ? '/account/security' : '/account/login') +
          '?authError=' +
          why +
          '&next=' +
          encodeURIComponent(c.nextPath),
      );
    if (query.error || !query.code || query.code.length > 4096) return fail('cancelled');
    try {
      const profile = await this.providers.googleIdentity(query.code, state, browserHash);
      const linked = await this.db.authIdentity.findUnique({
        where: { provider_subject: { provider: 'GOOGLE', subject: profile.subject } },
        include: { user: true },
      });
      if (c.purpose === 'LINK') {
        const actor = await this.ctx.fresh(req);
        if (actor.userId !== c.userId || actor.sessionId !== c.sessionId) return fail('invalid');
        if (linked?.userId !== actor.userId) {
          if (linked) return fail('link');
          await this.db.authIdentity.create({
            data: { provider: 'GOOGLE', subject: profile.subject, userId: actor.userId },
          });
        }
        return this.ctx.path(c.locale, '/account/security');
      }
      if (linked) {
        if (!linked.user.isActive || linked.user.role !== 'CUSTOMER') return fail('invalid');
        await this.auth.signInVerified(req, res, linked.user);
        return this.ctx.path(c.locale, c.nextPath);
      }
      if (await this.db.user.findUnique({ where: { email: profile.email }, select: { id: true } }))
        return fail('link');
      await this.db.authChallenge.update({
        where: { id: c.id },
        data: {
          purpose: 'REGISTER',
          consumedAt: null,
          subject: profile.subject,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      return this.ctx.path(
        c.locale,
        '/account/register?google=' + c.id + '&next=' + encodeURIComponent(c.nextPath),
      );
    } catch {
      return fail('invalid');
    }
  }
  async pending(id: string, req: Request) {
    const row = await this.db.authChallenge.findFirst({
      where: {
        id,
        browserHash: this.ctx.browser(req),
        channel: 'GOOGLE',
        purpose: 'REGISTER',
        subject: { not: null },
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) throw invalidCode();
    return row;
  }
  async finish(
    id: string,
    profile: { firstName: string; lastName: string; phone: string },
    req: Request,
    res: Response,
  ) {
    const c = await this.pending(id, req);
    try {
      const user = await this.db.$transaction(async (tx) => {
        const used = await tx.authChallenge.updateMany({
          where: {
            id,
            browserHash: c.browserHash,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { consumedAt: new Date() },
        });
        if (!used.count) throw invalidCode();
        return tx.user.create({
          data: {
            ...profile,
            email: c.email!,
            emailVerifiedAt: new Date(),
            locale: c.locale,
            role: 'CUSTOMER',
            identities: { create: { provider: 'GOOGLE', subject: c.subject! } },
          },
        });
      });
      await this.auth.signInVerified(req, res, user);
    } catch (err) {
      if (typeof err === 'object' && err && 'code' in err && err.code === 'P2002')
        throw linkingRequired();
      throw err;
    }
    return { accepted: true };
  }
}
