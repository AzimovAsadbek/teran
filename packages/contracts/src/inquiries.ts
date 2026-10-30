import { z } from 'zod';
import { emailSchema, localeSchema, optionalText } from './common.js';
import { BUSINESS_TYPES } from './constants.js';
import { normalizeUzPhone, regionCodeSchema } from './uzbekistan.js';

export const businessTypeSchema = z.enum(BUSINESS_TYPES);

export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] as const;
export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

/**
 * Hidden "website" field. Real visitors never see or fill it; simple bots do.
 * Submissions with a value are accepted silently and discarded.
 */
const honeypot = z.string().max(200).optional();

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const normalized = normalizeUzPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return z.NEVER;
    }
    return normalized;
  });

export const contactInquirySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema.optional().or(z.literal('').transform(() => undefined)),
    phone: optionalPhone,
    subject: optionalText(150),
    message: z.string().trim().min(10).max(3000),
    locale: localeSchema,
    website: honeypot,
  })
  .refine((value) => Boolean(value.email ?? value.phone), {
    error: 'contact_required',
    path: ['phone'],
  });
export type ContactInquiryInput = z.input<typeof contactInquirySchema>;

export const wholesaleInquirySchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  contactName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .transform((value, ctx) => {
      const normalized = normalizeUzPhone(value);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
        return z.NEVER;
      }
      return normalized;
    }),
  email: emailSchema.optional().or(z.literal('').transform(() => undefined)),
  businessType: businessTypeSchema,
  regionCode: regionCodeSchema.optional().or(z.literal('').transform(() => undefined)),
  city: optionalText(100),
  monthlyVolume: optionalText(100),
  message: optionalText(3000),
  locale: localeSchema,
  website: honeypot,
});
export type WholesaleInquiryInput = z.input<typeof wholesaleInquirySchema>;

export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  locale: localeSchema,
  source: z.string().trim().max(50).optional(),
  website: honeypot,
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

/** Both values come from the unsubscribe link (see the API's newsletterUnsubscribeToken). */
export const newsletterUnsubscribeSchema = z.object({
  id: z.uuid(),
  token: z.string().min(20).max(200),
});

/** Same response for new, existing and honeypot submissions, so the endpoint reveals nothing. */
export const acceptedSchema = z.object({ accepted: z.literal(true) });
export type AcceptedDto = z.infer<typeof acceptedSchema>;
