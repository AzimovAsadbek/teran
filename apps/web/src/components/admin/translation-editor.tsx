'use client';

import { LOCALES, type Locale } from '@teran/contracts';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TextAreaField, TextField } from '@/components/ui/field';

export interface TranslationField<K extends string> {
  key: K;
  label: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  hint?: string;
}

export type LocalizedValue<T> = { uz: T; ru: T | null; en: T | null };

/**
 * Per-language fieldsets. Uzbek is always present (it is the fallback); Russian and English can be
 * added or removed. Errors are looked up as `translations.<locale>.<field>`.
 */
export function TranslationEditor<K extends string>({
  value,
  fields,
  onChange,
  error,
}: {
  value: LocalizedValue<Record<K, string>>;
  fields: readonly TranslationField<K>[];
  onChange: (next: LocalizedValue<Record<K, string>>) => void;
  error: (path: string, current: string) => string | undefined;
}) {
  const t = useTranslations('Admin');
  const hasError = (locale: Locale) =>
    value[locale] !== null &&
    fields.some((field) =>
      Boolean(error(`translations.${locale}.${field.key}`, value[locale]?.[field.key] ?? '')),
    );
  const empty = () =>
    Object.fromEntries(fields.map((field) => [field.key, ''])) as Record<K, string>;

  function update(locale: Locale, key: K, text: string) {
    const current = value[locale] ?? empty();
    onChange({ ...value, [locale]: { ...current, [key]: text } });
  }

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-fg-subtle">{t('common.uzRequired')}</p>
      {LOCALES.map((locale) => {
        const current = value[locale];
        return (
          <details
            key={locale}
            // Uzbek is always open; other languages open when they have an error to show.
            open={locale === 'uz' || hasError(locale)}
            className="group rounded-card border border-line"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
              <span>
                {t(`common.locales.${locale}`)}
                {locale !== 'uz' && current === null ? (
                  <span className="ml-2 text-body-sm font-normal text-fg-subtle">— uz</span>
                ) : null}
              </span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-4 border-t border-line px-4 py-4">
              {current === null ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, [locale]: empty() })}
                  className="inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 hover:underline"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  {t('common.fillTranslation')}
                </button>
              ) : (
                <>
                  {fields.map((field) => {
                    const path = `translations.${locale}.${field.key}`;
                    const text = current[field.key];
                    const common = {
                      label: field.label,
                      name: `${locale}-${field.key}`,
                      required: field.required,
                      maxLength: field.maxLength,
                      hint: field.hint,
                      lang: locale === 'uz' ? 'uz-Latn' : locale,
                      value: text,
                      error: error(path, text),
                    };
                    return field.multiline ? (
                      <TextAreaField
                        key={field.key}
                        {...common}
                        rows={field.rows ?? 4}
                        onChange={(event) => update(locale, field.key, event.target.value)}
                      />
                    ) : (
                      <TextField
                        key={field.key}
                        {...common}
                        onChange={(event) => update(locale, field.key, event.target.value)}
                      />
                    );
                  })}
                  {locale !== 'uz' ? (
                    <button
                      type="button"
                      onClick={() => onChange({ ...value, [locale]: null })}
                      className="inline-flex items-center gap-2 text-body-sm font-semibold text-danger hover:underline"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      {t('common.removeTranslation')}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** Admin input → contract payload: empty optional texts become undefined, rows stay as typed. */
export function toTranslationPayload<K extends string>(value: LocalizedValue<Record<K, string>>) {
  const clean = (row: Record<K, string>) =>
    Object.fromEntries(
      Object.entries(row).map(([key, text]) => [
        key,
        (text as string).trim() === '' ? undefined : text,
      ]),
    );
  return {
    uz: clean(value.uz),
    ru: value.ru ? clean(value.ru) : null,
    en: value.en ? clean(value.en) : null,
  };
}

/** API translation (`{ uz, ru, en }` with optional fields) → editable strings. */
export function fromTranslation<K extends string>(
  value: {
    uz: Partial<Record<K, string>>;
    ru: Partial<Record<K, string>> | null;
    en: Partial<Record<K, string>> | null;
  } | null,
  keys: readonly K[],
): LocalizedValue<Record<K, string>> {
  const row = (source: Partial<Record<K, string>> | null) =>
    source
      ? (Object.fromEntries(keys.map((key) => [key, source[key] ?? ''])) as Record<K, string>)
      : null;
  const emptyRow = Object.fromEntries(keys.map((key) => [key, ''])) as Record<K, string>;
  return {
    uz: row(value?.uz ?? null) ?? emptyRow,
    ru: row(value?.ru ?? null),
    en: row(value?.en ?? null),
  };
}
