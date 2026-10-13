'use client';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { isValidationKey, type FieldIssue } from './forms';

/**
 * Turns a field issue into localised text; unknown issues fall back to a generic message. Pass the
 * field's current value so an empty required field reads "required" rather than "too short".
 */
export function useValidationMessage(): (
  issue: FieldIssue | undefined,
  value?: string,
) => string | undefined {
  const t = useTranslations('Validation');
  return (issue, value) => {
    if (!issue) return undefined;
    if (isValidationKey(issue.message)) return t(issue.message);
    if (issue.message === 'password_too_short') {
      return t('password_too_short', { min: issue.minimum ?? PASSWORD_MIN_LENGTH });
    }
    if (issue.message === 'password_too_long') {
      return t('too_long', { max: issue.maximum ?? PASSWORD_MAX_LENGTH });
    }
    if (issue.code === 'too_small' && value !== undefined && value.trim() === '') {
      return t('required');
    }
    if (issue.code === 'too_small') {
      return issue.minimum !== undefined && issue.minimum > 1
        ? t('too_short', { min: issue.minimum })
        : t('required');
    }
    if (issue.code === 'too_big' && issue.maximum !== undefined) {
      return t('too_long', { max: issue.maximum });
    }
    if (issue.code === 'invalid_type') return t('required');
    return t('invalid');
  };
}
