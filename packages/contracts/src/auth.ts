import { z } from 'zod';
import { emailSchema, localeSchema, optionalText } from './common.js';
import { uzPhoneSchema } from './uzbekistan.js';

export const USER_ROLES = ['CUSTOMER', 'MANAGER', 'ADMIN'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Roles allowed into the administration area. */
export const STAFF_ROLES: readonly UserRole[] = ['MANAGER', 'ADMIN'];
export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'password_too_short' })
  .max(PASSWORD_MAX_LENGTH, { error: 'password_too_long' });

export const loginSchema = z.object({
  email: emailSchema,
  // Not validated for strength on login: existing passwords must still be accepted.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: optionalText(60),
  phone: uzPhoneSchema.optional().or(z.literal('').transform(() => undefined)),
  locale: localeSchema.default('uz'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  locale: localeSchema.default('uz'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: optionalText(60),
  phone: uzPhoneSchema.optional().or(z.literal('').transform(() => undefined)),
  locale: localeSchema,
});

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  role: userRoleSchema,
  firstName: z.string(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  locale: localeSchema,
});
export type CurrentUserDto = z.infer<typeof currentUserSchema>;

export const authFeaturesSchema = z.object({
  /** False until outgoing e-mail is configured, so the UI never offers a reset it cannot deliver. */
  passwordReset: z.boolean(),
  registration: z.boolean(),
});
export type AuthFeaturesDto = z.infer<typeof authFeaturesSchema>;
