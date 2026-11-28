import type { Locale } from '@teran/contracts';
import type { MailMessage } from '../mail/mail.service.js';

const messages = {
  uz: {
    title: 'TERAN tasdiqlash kodi',
    intro: 'Ushbu kodni TERAN saytiga kiriting.',
    time: 'Kod 5 daqiqa amal qiladi. Uni hech kimga bermang. Agar kodni so‘ramagan bo‘lsangiz, xabarni e’tiborsiz qoldiring.',
    help: 'TERAN bilan bog‘lanish',
    contact: 'Raqamingizni tasdiqlash uchun quyidagi tugma orqali o‘z kontaktingizni ulashing.',
    share: 'Raqamimni ulash',
  },
  ru: {
    title: 'Код подтверждения TERAN',
    intro: 'Введите этот код на сайте TERAN.',
    time: 'Код действует 5 минут. Никому его не сообщайте. Если вы не запрашивали код, проигнорируйте сообщение.',
    help: 'Связаться с TERAN',
    contact: 'Чтобы подтвердить номер, поделитесь своим контактом с помощью кнопки.',
    share: 'Поделиться номером',
  },
  en: {
    title: 'Your TERAN verification code',
    intro: 'Enter this code on the TERAN website.',
    time: 'The code expires in 5 minutes. Keep it private. If you did not request a code, you can ignore this message.',
    help: 'Contact TERAN',
    contact: 'Use the button below to share your own contact and verify your number.',
    share: 'Share my number',
  },
};
export const identityCopy = (locale: Locale) => messages[locale];
export function verificationEmail(
  to: string,
  locale: Locale,
  code: string,
  support: string,
): MailMessage {
  const m = messages[locale];
  const url = new URL(support).href
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
  return {
    to,
    subject: m.title,
    text: [m.title, m.intro, code, m.time, m.help + ' ' + support].join('\n\n'),
    html: `<!doctype html><html lang="${locale}"><body style="background:#f7f6f2;color:#213c30;font-family:Arial,sans-serif"><main style="max-width:480px;margin:auto;padding:32px;background:white"><strong style="font:28px Georgia,serif;color:#28572b">TERAN</strong><h1 style="font:26px Georgia,serif">${m.title}</h1><p>${m.intro}</p><p style="font-size:32px;letter-spacing:.25em"><strong>${code}</strong></p><p>${m.time}</p><a href="${url}">${m.help}</a></main></body></html>`,
  };
}
