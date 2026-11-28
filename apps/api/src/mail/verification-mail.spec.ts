import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service.js';
import { verificationEmail } from '../auth/verification-copy.js';

describe('verification mail', () => {
  afterEach(() => vi.restoreAllMocks());
  it('retries a transient SMTP refusal and sends the text and HTML alternatives', async () => {
    const send = vi.fn().mockRejectedValueOnce({ responseCode: 451 }).mockResolvedValue({});
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: send,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const mail = new MailService(
      new ConfigService({
        MAIL_TRANSPORT: 'smtp',
        WEB_ORIGIN: 'https://example.test',
        MAIL_FROM: 'TERAN <test@example.test>',
        MAIL_REPLY_TO: 'help@example.test',
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        NODE_ENV: 'production',
      }),
    );
    const message = verificationEmail(
      'recipient@example.test',
      'uz',
      '246802',
      'https://example.test/contact',
    );
    await mail.send(message);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({
      ...message,
      from: 'TERAN <test@example.test>',
      replyTo: 'help@example.test',
    });
    expect(message.text).toContain('5 daqiqa');
    expect(message.html).toContain('246802');
    expect(message.html).toContain('https://example.test/contact');
    send.mockClear().mockRejectedValue({ responseCode: 550 });
    await expect(mail.send(message)).rejects.toThrow('SMTP delivery failed');
    expect(send).toHaveBeenCalledTimes(1);
  });
});
