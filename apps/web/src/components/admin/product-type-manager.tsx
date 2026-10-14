'use client';

import {
  ATTRIBUTE_KINDS,
  productTypeUpsertSchema,
  type AdminProductType,
  type AttributeKind,
  type Locale,
} from '@teran/contracts';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { table } from './ui';
import { useAdminAction } from './use-admin-action';

type Labels = { uz: string; ru: string; en: string };

interface OptionDraft {
  id?: string;
  key: string;
  labels: Labels;
  usageCount: number;
}

interface AttributeDraft {
  id?: string;
  key: string;
  kind: AttributeKind;
  unit: string;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVisible: boolean;
  labels: Labels;
  hint: string;
  options: OptionDraft[];
  usageCount: number;
}

const CHOICE: readonly AttributeKind[] = ['SELECT', 'MULTI_SELECT'];
const EMPTY_LABELS: Labels = { uz: '', ru: '', en: '' };

function labels(translations: {
  uz: { label: string };
  ru: { label: string } | null;
  en: { label: string } | null;
}): Labels {
  return {
    uz: translations.uz.label,
    ru: translations.ru?.label ?? '',
    en: translations.en?.label ?? '',
  };
}

/** `{ uz, ru, en }` texts → the API's translation shape (empty ru/en are omitted). */
function toTranslations<K extends string>(values: Labels, key: K, extra?: Record<string, string>) {
  const entry = (text: string) => ({ [key]: text.trim(), ...extra }) as Record<K, string>;
  return {
    uz: entry(values.uz),
    ru: values.ru.trim() ? entry(values.ru) : null,
    en: values.en.trim() ? entry(values.en) : null,
  };
}

function fromType(type: AdminProductType | null) {
  return {
    key: type?.key ?? '',
    isActive: type?.isActive ?? true,
    position: String(type?.position ?? 0),
    names: type
      ? {
          uz: type.translations.uz.name,
          ru: type.translations.ru?.name ?? '',
          en: type.translations.en?.name ?? '',
        }
      : EMPTY_LABELS,
    attributes: (type?.attributes ?? []).map((attribute): AttributeDraft => ({
      id: attribute.id,
      key: attribute.key,
      kind: attribute.kind,
      unit: attribute.unit ?? '',
      isRequired: attribute.isRequired,
      isFilterable: attribute.isFilterable,
      isSearchable: attribute.isSearchable,
      isVisible: attribute.isVisible,
      labels: labels(attribute.translations),
      hint: attribute.translations.uz.hint ?? '',
      usageCount: attribute.usageCount,
      options: attribute.options.map((option) => ({
        id: option.id,
        key: option.key,
        labels: labels(option.translations),
        usageCount: option.usageCount,
      })),
    })),
  };
}

/** Three short fields for a label in each language (Uzbek required). */
function LabelFields({
  value,
  onChange,
  label,
  error,
}: {
  value: Labels;
  onChange: (next: Labels) => void;
  label: string;
  error?: string;
}) {
  const t = useTranslations('Admin');
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(['uz', 'ru', 'en'] as const).map((locale) => (
        <TextField
          key={locale}
          label={`${label} · ${t(`common.locales.${locale}`)}`}
          name={`label-${locale}`}
          required={locale === 'uz'}
          size="sm"
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
          error={locale === 'uz' ? error : undefined}
        />
      ))}
    </div>
  );
}

function ProductTypeForm({ type, onDone }: { type: AdminProductType | null; onDone: () => void }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [draft, setDraft] = useState(() => fromType(type));
  const error = (path: string, value?: string) => message(form.errors[path], value);

  const setAttribute = (index: number, patch: Partial<AttributeDraft>) =>
    setDraft((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, position) =>
        position === index ? { ...attribute, ...patch } : attribute,
      ),
    }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      key: draft.key.trim(),
      isActive: draft.isActive,
      position: Number(draft.position) || 0,
      translations: toTranslations(draft.names, 'name'),
      attributes: draft.attributes.map((attribute) => ({
        ...(attribute.id ? { id: attribute.id } : {}),
        key: attribute.key.trim(),
        kind: attribute.kind,
        unit: attribute.unit.trim() || undefined,
        isRequired: attribute.isRequired,
        isFilterable: attribute.isFilterable,
        isSearchable: attribute.isSearchable,
        isVisible: attribute.isVisible,
        translations: {
          ...toTranslations(attribute.labels, 'label'),
          uz: {
            label: attribute.labels.uz.trim(),
            ...(attribute.hint.trim() ? { hint: attribute.hint.trim() } : {}),
          },
        },
        options: CHOICE.includes(attribute.kind)
          ? attribute.options.map((option) => ({
              ...(option.id ? { id: option.id } : {}),
              key: option.key.trim(),
              translations: toTranslations(option.labels, 'label'),
            }))
          : [],
      })),
    };
    const saved = await form.submit(productTypeUpsertSchema, payload, (data) =>
      type
        ? apiRequest(`/admin/product-types/${type.id}`, { method: 'PUT', body: data })
        : apiRequest('/admin/product-types', { method: 'POST', body: data }),
    );
    if (saved) {
      router.refresh();
      onDone();
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6 px-5 py-4">
      <FormErrorSummary message={form.summary} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('productTypes.key')}
          name="key"
          required
          hint={t('productTypes.keyHint')}
          value={draft.key}
          onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
          error={error('key', draft.key)}
        />
        <TextField
          label={t('common.position')}
          name="position"
          inputMode="numeric"
          value={draft.position}
          onChange={(event) =>
            setDraft((current) => ({ ...current, position: event.target.value }))
          }
          error={error('position', draft.position)}
        />
      </div>
      <LabelFields
        label={t('productTypes.name')}
        value={draft.names}
        onChange={(names) => setDraft((current) => ({ ...current, names }))}
        error={error('translations.uz.name', draft.names.uz)}
      />
      <CheckboxField
        label={t('common.active')}
        name="isActive"
        checked={draft.isActive}
        onChange={(event) =>
          setDraft((current) => ({ ...current, isActive: event.target.checked }))
        }
      />

      <fieldset className="space-y-4">
        <legend className="text-label text-fg">{t('productTypes.attributes')}</legend>
        {draft.attributes.map((attribute, index) => {
          const used = attribute.usageCount > 0;
          const prefix = `attributes.${index}`;
          return (
            <div
              key={attribute.id ?? `new-${index}`}
              className="space-y-3 rounded-card border border-line p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <TextField
                    label={t('productTypes.attributeKey')}
                    name={`${prefix}.key`}
                    required
                    size="sm"
                    value={attribute.key}
                    onChange={(event) => setAttribute(index, { key: event.target.value })}
                    error={error(`${prefix}.key`, attribute.key)}
                  />
                  <SelectField
                    label={t('productTypes.kind')}
                    name={`${prefix}.kind`}
                    size="sm"
                    disabled={used}
                    options={ATTRIBUTE_KINDS.map((kind) => ({
                      value: kind,
                      label: t(`productTypes.kinds.${kind}`),
                    }))}
                    value={attribute.kind}
                    onChange={(event) =>
                      setAttribute(index, { kind: event.target.value as AttributeKind })
                    }
                    error={error(`${prefix}.kind`)}
                  />
                  <TextField
                    label={t('productTypes.unit')}
                    name={`${prefix}.unit`}
                    size="sm"
                    value={attribute.unit}
                    onChange={(event) => setAttribute(index, { unit: event.target.value })}
                  />
                </div>
                <button
                  type="button"
                  disabled={used}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      attributes: current.attributes.filter((_, position) => position !== index),
                    }))
                  }
                  className={iconButtonClasses('danger', 'sm', 'mt-6')}
                  aria-label={t('productTypes.removeAttribute')}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
              {used ? (
                <p className="text-xs text-fg-subtle">
                  {t('productTypes.inUse', { count: attribute.usageCount })}
                </p>
              ) : null}
              <LabelFields
                label={t('productTypes.attributeLabel')}
                value={attribute.labels}
                onChange={(next) => setAttribute(index, { labels: next })}
                error={error(`${prefix}.translations.uz.label`, attribute.labels.uz)}
              />
              <TextField
                label={t('productTypes.attributeHint')}
                name={`${prefix}.hint`}
                size="sm"
                value={attribute.hint}
                onChange={(event) => setAttribute(index, { hint: event.target.value })}
              />
              <div className="grid gap-x-4 sm:grid-cols-2">
                {(
                  [
                    ['isRequired', 'required'],
                    ['isFilterable', 'filterable'],
                    ['isSearchable', 'searchable'],
                    ['isVisible', 'visible'],
                  ] as const
                ).map(([flag, label]) => (
                  <CheckboxField
                    key={flag}
                    label={t(`productTypes.${label}`)}
                    name={`${prefix}.${flag}`}
                    checked={attribute[flag]}
                    onChange={(event) => setAttribute(index, { [flag]: event.target.checked })}
                    error={flag === 'isFilterable' ? error(`${prefix}.isFilterable`) : undefined}
                  />
                ))}
              </div>
              {CHOICE.includes(attribute.kind) ? (
                <div className="space-y-2 border-t border-line-subtle pt-3">
                  <p className="text-label text-fg">{t('productTypes.options')}</p>
                  {error(`${prefix}.options`) ? (
                    <p className="text-helper text-danger">{error(`${prefix}.options`)}</p>
                  ) : null}
                  {attribute.options.map((option, optionIndex) => (
                    <div
                      key={option.id ?? `new-${optionIndex}`}
                      className="grid items-end gap-2 sm:grid-cols-[8rem_1fr_1fr_1fr_auto]"
                    >
                      <TextField
                        label={t('productTypes.optionKey')}
                        name={`${prefix}.options.${optionIndex}.key`}
                        size="sm"
                        required
                        value={option.key}
                        onChange={(event) =>
                          setAttribute(index, {
                            options: attribute.options.map((entry, position) =>
                              position === optionIndex
                                ? { ...entry, key: event.target.value }
                                : entry,
                            ),
                          })
                        }
                        error={error(`${prefix}.options.${optionIndex}.key`, option.key)}
                      />
                      {(['uz', 'ru', 'en'] as const).map((locale) => (
                        <TextField
                          key={locale}
                          label={`${t('productTypes.optionLabel')} · ${t(`common.locales.${locale}`)}`}
                          name={`${prefix}.options.${optionIndex}.${locale}`}
                          size="sm"
                          required={locale === 'uz'}
                          value={option.labels[locale]}
                          onChange={(event) =>
                            setAttribute(index, {
                              options: attribute.options.map((entry, position) =>
                                position === optionIndex
                                  ? {
                                      ...entry,
                                      labels: { ...entry.labels, [locale]: event.target.value },
                                    }
                                  : entry,
                              ),
                            })
                          }
                        />
                      ))}
                      <button
                        type="button"
                        disabled={option.usageCount > 0}
                        onClick={() =>
                          setAttribute(index, {
                            options: attribute.options.filter(
                              (_, position) => position !== optionIndex,
                            ),
                          })
                        }
                        className={iconButtonClasses('ghost', 'sm')}
                        aria-label={t('productTypes.removeOption')}
                      >
                        <X aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAttribute(index, {
                        options: [
                          ...attribute.options,
                          { key: '', labels: EMPTY_LABELS, usageCount: 0 },
                        ],
                      })
                    }
                    className={buttonClasses('ghost', 'sm')}
                  >
                    <Plus aria-hidden className="h-4 w-4" />
                    {t('productTypes.addOption')}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              attributes: [
                ...current.attributes,
                {
                  key: '',
                  kind: 'SELECT',
                  unit: '',
                  isRequired: false,
                  isFilterable: true,
                  isSearchable: false,
                  isVisible: true,
                  labels: EMPTY_LABELS,
                  hint: '',
                  options: [],
                  usageCount: 0,
                },
              ],
            }))
          }
          className={buttonClasses('secondary', 'sm')}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t('productTypes.addAttribute')}
        </button>
      </fieldset>

      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={type ? t('common.save') : t('common.create')}
        sendingLabel={t('common.saving')}
      />
    </form>
  );
}

/** Product types: list, side-sheet editor and deletion of unused types. */
export function ProductTypeManager({ types }: { types: AdminProductType[] }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const action = useAdminAction();
  const [editing, setEditing] = useState<AdminProductType | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminProductType | null>(null);
  const name = (type: AdminProductType) =>
    type.translations[locale]?.name ?? type.translations.uz.name;

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={buttonClasses('primary')}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t('productTypes.new')}
        </button>
      </div>
      {types.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong/45 bg-surface px-6 py-12 text-center text-fg-subtle">
          {t('productTypes.empty')}
        </p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('productTypes.name')}
                </th>
                <th scope="col" className={table.th}>
                  {t('productTypes.key')}
                </th>
                <th scope="col" className={table.th}>
                  {t('productTypes.attributes')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('taxonomy.products')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id}>
                  <td className={`${table.td} font-semibold`}>{name(type)}</td>
                  <td className={`${table.td} font-mono text-xs`}>{type.key}</td>
                  <td className={`${table.td} text-xs`}>
                    {type.attributes
                      .map(
                        (attribute) =>
                          `${attribute.translations[locale]?.label ?? attribute.translations.uz.label} (${t(`productTypes.kinds.${attribute.kind}`)})`,
                      )
                      .join(', ') || '—'}
                  </td>
                  <td className={`${table.td} text-right tabular-nums`}>{type.productCount}</td>
                  <td className={table.td}>
                    {type.isActive ? t('common.active') : t('common.inactive')}
                  </td>
                  <td className={`${table.td} text-right`}>
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(type)}
                        className={iconButtonClasses('ghost', 'sm')}
                        aria-label={`${t('common.edit')}: ${name(type)}`}
                      >
                        <Pencil aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={type.productCount > 0}
                        onClick={() => setDeleting(type)}
                        className={iconButtonClasses('danger', 'sm')}
                        aria-label={`${t('common.delete')}: ${name(type)}`}
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        side="right"
        title={editing === 'new' ? t('productTypes.new') : editing ? t('productTypes.edit') : ''}
        closeLabel={tc('close')}
      >
        {editing !== null ? (
          <ProductTypeForm
            key={editing === 'new' ? 'new' : editing.id}
            type={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? t('productTypes.deleteConfirm', { name: name(deleting) }) : ''}
        confirmLabel={t('common.delete')}
        tone="danger"
        pending={action.pending}
        error={action.error}
        onClose={() => {
          setDeleting(null);
          action.clearError();
        }}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          void action
            .run(() => apiRequest(`/admin/product-types/${target.id}`, { method: 'DELETE' }))
            .then((ok) => {
              if (ok) setDeleting(null);
            });
        }}
      />
    </>
  );
}
