import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Locale } from '@teran/contracts';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
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
  private readonly webOrigin: string;
  private readonly transporter: Transporter | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.mode = config.get('MAIL_TRANSPORT', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true }).replace(/\/$/, '');
    if (this.mode === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      this.transporter = nodemailer.createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
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
      this.logger.log({ mail: message }, 'E-mail captured by the log transport (not sent)');
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
