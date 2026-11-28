import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { emailSchema, type Locale } from '@teran/contracts';
import { digestsEqual, sha256 } from '../common/crypto.js';
import { IdentityContext, invalidCode, unavailable } from './identity-context.js';
import { identityCopy } from './verification-copy.js';

@Injectable()
export class IdentityProviders {
  private readonly logger = new Logger(IdentityProviders.name);
  private readonly keys = createRemoteJWKSet(
    new URL('https://www.googleapis.com/oauth2/v3/certs'),
    { timeoutDuration: 5000 },
  );
  constructor(private readonly ctx: IdentityContext) {}
  get google() {
    return !!this.ctx.settings.get('GOOGLE_CLIENT_ID', { infer: true });
  }
  get telegram() {
    return !!this.ctx.settings.get('AUTH_TELEGRAM_BOT_TOKEN', { infer: true });
  }
  private get callback() {
    return this.ctx.origin + '/api/v1/auth/google/callback';
  }
  telegramLink(token: string) {
    if (!this.telegram) throw unavailable();
    return (
      'https://t.me/' +
      this.ctx.settings.get('AUTH_TELEGRAM_USERNAME', { infer: true }) +
      '?start=' +
      token
    );
  }
  verifyWebhook(secret: unknown) {
    const expected = this.ctx.settings.get('AUTH_TELEGRAM_WEBHOOK_SECRET', { infer: true });
    return (
      typeof secret === 'string' && !!expected && digestsEqual(sha256(secret), sha256(expected))
    );
  }
  async telegramMessage(id: string, locale: Locale, code?: string) {
    const token = this.ctx.settings.get('AUTH_TELEGRAM_BOT_TOKEN', { infer: true });
    if (!token) throw unavailable();
    const m = identityCopy(locale);
    const body = code
      ? {
          text: [m.title, code, m.intro, m.time].join('\n\n'),
          reply_markup: { remove_keyboard: true },
        }
      : {
          text: m.contact,
          reply_markup: {
            keyboard: [[{ text: m.share, request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        };
    const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: id, ...body, protect_content: true }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    const result: unknown = res?.ok ? await res.json().catch(() => null) : null;
    if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
      this.logger.warn({ event: 'telegram_auth_delivery_failed', httpStatus: res?.status ?? null });
      throw unavailable();
    }
    this.logger.log({ event: 'telegram_auth_delivery_accepted' });
  }
  googleUrl(state: string, browser: string) {
    if (!this.google) throw unavailable();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    const verifier = this.ctx.derive('google-pkce', state, browser);
    url.search = new URLSearchParams({
      client_id: this.ctx.settings.getOrThrow('GOOGLE_CLIENT_ID', { infer: true }),
      redirect_uri: this.callback,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce: this.ctx.derive('google-nonce', state, browser),
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.href;
  }
  async googleIdentity(code: string, state: string, browser: string) {
    if (!this.google) throw unavailable();
    const client = this.ctx.settings.getOrThrow('GOOGLE_CLIENT_ID', { infer: true });
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: client,
        client_secret: this.ctx.settings.getOrThrow('GOOGLE_CLIENT_SECRET', { infer: true }),
        code,
        grant_type: 'authorization_code',
        code_verifier: this.ctx.derive('google-pkce', state, browser),
        redirect_uri: this.callback,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw invalidCode();
    const payload = (await r.json()) as { id_token?: unknown };
    if (typeof payload.id_token !== 'string') throw invalidCode();
    return verifyGoogleToken(
      payload.id_token,
      this.keys,
      client,
      this.ctx.derive('google-nonce', state, browser),
    );
  }
}

export async function verifyGoogleToken(
  token: string,
  keys: JWTVerifyGetKey,
  client: string,
  nonce: string,
) {
  const { payload: claims } = await jwtVerify(token, keys, {
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
    audience: client,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'iat', 'exp', 'nonce', 'email_verified', 'email'],
    clockTolerance: 5,
  });
  const email = emailSchema.safeParse(claims.email);
  if (
    claims.nonce !== nonce ||
    claims.email_verified !== true ||
    !email.success ||
    !claims.sub ||
    claims.sub.length > 255 ||
    (claims.azp !== undefined && claims.azp !== client) ||
    (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== client)
  )
    throw invalidCode();
  return {
    subject: claims.sub,
    email: email.data,
    firstName: typeof claims.given_name === 'string' ? claims.given_name.slice(0, 60) : '',
    lastName: typeof claims.family_name === 'string' ? claims.family_name.slice(0, 60) : '',
  };
}
