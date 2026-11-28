import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Locale } from '@teran/contracts';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Outgoing e-mail. Disabled until TERAN configures SMTP; features that depend on e-mail
 * (password reset, order confirmations) check `isEnabled` and are hidden otherwise.
 * The "log" transport is a development aid and is rejected in production by env validation.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mode: Env['MAIL_TRANSPORT'];
  private readonly from: string | undefined;
  private readonly replyTo: string | undefined;
  private readonly webOrigin: string;
  private readonly transporter: Transporter | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.mode = config.get('MAIL_TRANSPORT', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.replyTo = config.get('MAIL_REPLY_TO', { infer: true });
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true }).replace(/\/$/, '');
    if (this.mode === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      const secure = config.get('SMTP_SECURE', { infer: true });
      this.transporter = nodemailer.createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure,
        // Without implicit TLS, production refuses to send (and to log in) over plain text.
        requireTLS: !secure && config.get('NODE_ENV', { infer: true }) === 'production',
        auth: user ? { user, pass: config.get('SMTP_PASSWORD', { infer: true }) } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
    }
  }

  get isEnabled(): boolean {
    return this.mode !== 'disabled';
  }

  get canDeliverCodes(): boolean {
    return this.mode === 'smtp';
  }

  /** Absolute storefront URL for a path in the given locale (Uzbek has no prefix). */
  webUrl(locale: Locale, path: string): string {
    const prefix = locale === 'uz' ? '' : `/${locale}`;
    return `${this.webOrigin}${prefix}${path}`;
  }

  async send(message: MailMessage): Promise<void> {
    if (this.mode === 'disabled') {
      throw new Error('E-mail is not configured');
    }
    if (this.mode === 'log' || !this.transporter) {
      this.logger.log('Development e-mail accepted without delivery');
      return;
    }
    for (let attempt = 0; ; attempt++) {
      try {
        await this.transporter.sendMail({ ...message, from: this.from, replyTo: this.replyTo });
        this.logger.log('SMTP accepted a message');
        return;
      } catch (error) {
        const code = (error as { responseCode?: number }).responseCode;
        if (attempt >= 2 || !code || code < 400 || code >= 500)
          throw new Error('SMTP delivery failed');
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
}
