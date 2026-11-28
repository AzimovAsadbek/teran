import { z } from 'zod';
import { emailSchema, localeSchema } from './common.js';
import { uzPhoneSchema } from './uzbekistan.js';

export const personalInfoSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: emailSchema,
  phone: uzPhoneSchema,
});
export const verificationStartSchema = z.union([
  z.object({
    purpose: z.literal('LOGIN'),
    channel: z.literal('EMAIL'),
    email: emailSchema,
    locale: localeSchema,
  }),
  z.object({ purpose: z.literal('LOGIN'), channel: z.literal('TELEGRAM'), locale: localeSchema }),
  z.object({
    purpose: z.literal('REGISTER'),
    channel: z.enum(['EMAIL', 'TELEGRAM']),
    profile: personalInfoSchema,
    locale: localeSchema,
  }),
  z.object({ purpose: z.literal('LINK'), channel: z.literal('TELEGRAM'), locale: localeSchema }),
  z.object({
    purpose: z.literal('EMAIL_CHANGE'),
    channel: z.literal('EMAIL'),
    email: emailSchema,
    locale: localeSchema,
  }),
  z.object({
    purpose: z.literal('PHONE_CHANGE'),
    channel: z.literal('TELEGRAM'),
    phone: uzPhoneSchema,
    locale: localeSchema,
  }),
]);
export type VerificationStart = z.output<typeof verificationStartSchema>;
export const verifyCodeSchema = z.object({ id: z.uuid(), code: z.string().regex(/^\d{6}$/) });
export interface ChallengeDto {
  id: string;
  expiresAt: string;
  resendAt: string;
  telegramUrl?: string;
}
export interface TelegramChallengeStatus {
  state: 'waiting' | 'opened' | 'ended';
}
export const googleStartSchema = z.object({
  purpose: z.enum(['LOGIN', 'LINK']),
  locale: localeSchema,
  next: z.string().max(300).optional(),
});
export const googleProfileSchema = personalInfoSchema.omit({ email: true });
export interface ConnectedMethodsDto {
  email: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  google: boolean;
  telegram: boolean;
  password: boolean;
}
