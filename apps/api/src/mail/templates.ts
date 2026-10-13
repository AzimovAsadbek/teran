import type { Locale } from '@teran/contracts';
import type { MailMessage } from './mail.service.js';

type Template<A> = (locale: Locale, args: A) => Omit<MailMessage, 'to'>;

export const passwordResetEmail: Template<{ link: string; minutes: number }> = (
  locale,
  { link, minutes },
) => {
  switch (locale) {
    case 'ru':
      return {
        subject: 'TERAN: восстановление пароля',
        text: `Здравствуйте!\n\nЧтобы задать новый пароль, перейдите по ссылке (действует ${minutes} минут):\n${link}\n\nЕсли вы не запрашивали смену пароля, просто проигнорируйте это письмо.\n\nTERAN`,
      };
    case 'en':
      return {
        subject: 'TERAN: reset your password',
        text: `Hello,\n\nTo choose a new password, open this link (valid for ${minutes} minutes):\n${link}\n\nIf you did not request a password reset, you can ignore this e-mail.\n\nTERAN`,
      };
    default:
      return {
        subject: 'TERAN: parolni tiklash',
        text: `Assalomu alaykum!\n\nYangi parol oʻrnatish uchun havolaga oʻting (${minutes} daqiqa amal qiladi):\n${link}\n\nAgar siz parolni tiklashni soʻramagan boʻlsangiz, bu xatni eʼtiborsiz qoldiring.\n\nTERAN`,
      };
  }
};

export const orderConfirmationEmail: Template<{ number: string; total: string; link: string }> = (
  locale,
  { number, total, link },
) => {
  switch (locale) {
    case 'ru':
      return {
        subject: `TERAN: заказ ${number} принят`,
        text: `Спасибо за заказ!\n\nНомер заказа: ${number}\nСумма: ${total}\n\nСтатус заказа можно посмотреть по ссылке:\n${link}\n\nМы свяжемся с вами для подтверждения доставки.\n\nTERAN`,
      };
    case 'en':
      return {
        subject: `TERAN: order ${number} received`,
        text: `Thank you for your order!\n\nOrder number: ${number}\nTotal: ${total}\n\nYou can follow your order here:\n${link}\n\nWe will contact you to confirm delivery.\n\nTERAN`,
      };
    default:
      return {
        subject: `TERAN: ${number} raqamli buyurtma qabul qilindi`,
        text: `Buyurtmangiz uchun rahmat!\n\nBuyurtma raqami: ${number}\nSumma: ${total}\n\nBuyurtma holatini quyidagi havola orqali kuzatishingiz mumkin:\n${link}\n\nYetkazib berishni tasdiqlash uchun siz bilan bogʻlanamiz.\n\nTERAN`,
      };
  }
};
