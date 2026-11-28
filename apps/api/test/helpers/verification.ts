import request from 'supertest';
import type { TestApp } from './app.js';
import { MailService } from '../../src/mail/mail.service.js';

export function captureVerificationMail(ctx: TestApp) {
  const messages = new Map<string, string>();
  const mail = ctx.app.get(MailService);
  vi.spyOn(mail, 'canDeliverCodes', 'get').mockReturnValue(true);
  const delivery = vi.spyOn(mail, 'send').mockImplementation((message) => {
    const code = message.text.match(/^\d{6}$/m)?.[0];
    if (code) messages.set(message.to, code);
    return Promise.resolve();
  });
  return {
    delivery,
    codeFor(email: string) {
      const value = messages.get(email);
      if (!value) throw new Error('No verification message for test recipient');
      return value;
    },
  };
}
export function registration(email: string) {
  return {
    purpose: 'REGISTER',
    channel: 'EMAIL',
    locale: 'en',
    profile: { email, phone: '+998901234567', firstName: 'Aziza', lastName: 'Karimova' },
  };
}
export async function registerShopper(
  ctx: TestApp,
  browser: ReturnType<typeof request.agent>,
  email: string,
): Promise<request.Response> {
  const mail = captureVerificationMail(ctx);
  const started = await browser
    .post('/api/v1/auth/verification/start')
    .send(registration(email))
    .expect(202);
  return browser
    .post('/api/v1/auth/verification/confirm')
    .send({ id: started.body.id, code: mail.codeFor(email.trim().toLowerCase()) })
    .expect(200);
}
