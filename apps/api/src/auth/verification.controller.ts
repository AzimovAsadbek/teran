import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  googleProfileSchema,
  googleStartSchema,
  verificationStartSchema,
  verifyCodeSchema,
} from '@teran/contracts';
import { z } from 'zod';
import { ApiException } from '../common/errors/api-exception.js';
import { AuthService } from './auth.service.js';
import { CurrentAuth, RequireAuth } from './auth.guard.js';
import type { RequestAuth } from './auth.types.js';
import { VerificationService } from './verification.service.js';
import { GoogleSignInService } from './google-sign-in.service.js';
import { IdentityContext } from './identity-context.js';
import { IdentityProviders } from './identity-providers.js';

const updateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number().int().safe(), type: z.string() }),
      from: z
        .object({ id: z.number().int().positive().safe(), is_bot: z.boolean().optional() })
        .optional(),
      text: z.string().max(4096).optional(),
      contact: z
        .object({ phone_number: z.string().max(32), user_id: z.number().int().safe().optional() })
        .optional(),
    })
    .optional(),
});
@Controller('auth')
export class VerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly google: GoogleSignInService,
    private readonly providers: IdentityProviders,
    private readonly ctx: IdentityContext,
    private readonly auth: AuthService,
  ) {}
  @Post('verification/start')
  @HttpCode(202)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  start(
    @Body({ schema: verificationStartSchema }) data: z.output<typeof verificationStartSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verification.start(data, req, res);
  }
  @Post('verification/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  verify(
    @Body({ schema: verifyCodeSchema }) data: z.output<typeof verifyCodeSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verification.verify(data.id, data.code, req, res);
  }
  @Get('verification/:id/telegram-status')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  telegramStatus(@Param('id', { schema: z.uuid() }) id: string, @Req() req: Request) {
    return this.verification.telegramStatus(id, req);
  }
  @Post('telegram/webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async update(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.providers.verifyWebhook(secret)) throw ApiException.forbidden();
    const update = updateSchema.safeParse(body);
    const m = update.success ? update.data.message : null;
    if (!m?.from || m.from.is_bot || m.chat.type !== 'private' || m.chat.id !== m.from.id)
      return { ok: true };
    const subject = String(m.from.id);
    const match = m.text?.match(/^\/start(?:@\w+)? ([A-Za-z0-9_-]{43})$/);
    if (match) await this.verification.telegramStart(match[1]!, subject);
    else if (m.contact?.user_id === m.from.id)
      await this.verification.telegramContact(subject, m.contact.phone_number);
    return { ok: true };
  }
  @Post('google/start')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startGoogle(
    @Body({ schema: googleStartSchema }) data: z.output<typeof googleStartSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.google.start(data, req, res);
  }
  @Get('google/callback')
  @Header('Referrer-Policy', 'no-referrer')
  async googleCallback(
    @Query() query: { code?: string; state?: string; error?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let target: string;
    try {
      target = await this.google.callback(query, req, res);
    } catch {
      target = this.ctx.path('uz', '/account/login?authError=invalid');
    }
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(303, target);
  }
  @Get('google/profile/:id')
  @Header('Cache-Control', 'private, no-store')
  async profile(@Param('id', { schema: z.uuid() }) id: string, @Req() req: Request) {
    const c = await this.google.pending(id, req);
    return { firstName: c.firstName, lastName: c.lastName, email: c.email };
  }
  @Post('google/profile/:id')
  @HttpCode(200)
  finish(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: googleProfileSchema }) data: z.output<typeof googleProfileSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.google.finish(id, data, req, res);
  }
  @Get('connections')
  @Header('Cache-Control', 'private, no-store')
  @RequireAuth()
  methods(@CurrentAuth() who: RequestAuth) {
    return this.verification.methods(who.userId);
  }
  @Delete('connections/:provider')
  @RequireAuth()
  @HttpCode(204)
  unlink(
    @Param('provider', { schema: z.enum(['GOOGLE', 'TELEGRAM']) }) provider: 'GOOGLE' | 'TELEGRAM',
    @Req() req: Request,
  ) {
    return this.verification.disconnect(provider, req);
  }
  @Post('session/refresh')
  @RequireAuth()
  @HttpCode(204)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }
}
