'use client';

import {
  ATTRIBUTE_KINDS,
  productTypeUpsertSchema,
  type AdminProductType,
  type AttributeKind,
  type Locale,
} from '@teran/contracts';
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';
import {
  CheckboxField,
  FormErrorSummary,
  inputClasses,
  SelectField,
  TextField,
} from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { slugify } from '@/lib/slugify';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { Cell, table } from './table';
import { notify } from './toast';
import { useAdminAction } from './use-admin-action';

type Labels = { uz: string; ru: string; en: string };

interface OptionDraft {
  id?: string;
  key: string;
  /** A new choice's key follows its Uzbek name. */
  keyAuto: boolean;
  labels: Labels;
  usageCount: number;
}

interface AttributeDraft {
  id?: string;
  key: string;
  /** A new characteristic's key follows its Uzbek name. */
  keyAuto: boolean;
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

interface TypeDraft {
  key: string;
  keyAuto: boolean;
  isActive: boolean;
  brewingGuide: boolean;
  position: string;
  names: Labels;
  attributes: AttributeDraft[];
}

const CHOICE: readonly AttributeKind[] = ['SELECT', 'MULTI_SELECT'];
const EMPTY_LABELS: Labels = { uz: '', ru: '', en: '' };
const LANGUAGES = ['uz', 'ru', 'en'] as const;

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

function fromType(type: AdminProductType | null): TypeDraft {
  return {
    key: type?.key ?? '',
    keyAuto: type === null,
    isActive: type?.isActive ?? true,
    brewingGuide: type?.brewingGuide ?? false,
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
      keyAuto: false,
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
        keyAuto: false,
        labels: labels(option.translations),
        usageCount: option.usageCount,
      })),
    })),
  };
}

/** Keys made from the Uzbek names (for new items only: saved keys appear in links). */
function withKeys(draft: TypeDraft): TypeDraft {
  return {
    ...draft,
    key: draft.keyAuto ? slugify(draft.names.uz, 40) : draft.key,
    attributes: draft.attributes.map((attribute) => ({
      ...attribute,
      key: attribute.keyAuto ? slugify(attribute.labels.uz, 40) : attribute.key,
      options: attribute.options.map((option) => ({
        ...option,
        key: option.keyAuto ? slugify(option.labels.uz, 40) : option.key,
      })),
    })),
  };
}

function toPayload(draft: TypeDraft) {
  return {
    key: draft.key.trim(),
    isActive: draft.isActive,
    brewingGuide: draft.brewingGuide,
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
}

/** Three fields for a name in each language (Uzbek required), side by side on wide screens. */
function LabelFields({
  value,
  onChange,
  label,
  error,
  name,
}: {
  value: Labels;
  onChange: (next: Labels) => void;
  label: string;
  error?: string;
  name: string;
}) {
  const t = useTranslations('Admin');
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {LANGUAGES.map((locale) => (
        <TextField
          key={locale}
          label={`${label} · ${t(`common.locales.${locale}`)}`}
          name={`${name}-${locale}`}
          lang={locale === 'uz' ? 'uz-Latn' : locale}
          required={locale === 'uz'}
          size="sm"
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
          error={locale === 'uz' ? error : undefined}
          data-autofocus={name === 'type-name' && locale === 'uz' ? true : undefined}
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
  const payload = toPayload(draft);
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);

  const update = (next: (current: TypeDraft) => TypeDraft) =>
    setDraft((current) => withKeys(next(current)));
  const setAttribute = (index: number, patch: Partial<AttributeDraft>) =>
    update((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, position) =>
        position === index ? { ...attribute, ...patch } : attribute,
      ),
    }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(productTypeUpsertSchema, payload, (data) =>
      type
        ? apiRequest(`/admin/product-types/${type.id}`, { method: 'PUT', body: data })
        : apiRequest('/admin/product-types', { method: 'POST', body: data }),
    );
    if (saved) {
      notify(t('productTypes.saved'));
      router.refresh();
      onDone();
    }
  }

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 px-5 py-5 sm:px-6"
    >
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      <LabelFields
        name="type-name"
        label={t('productTypes.name')}
        value={draft.names}
        onChange={(names) => update((current) => ({ ...current, names }))}
        error={error('translations.uz.name', draft.names.uz) ?? error('key', draft.key)}
      />
      <CheckboxField
        label={t('common.active')}
        name="isActive"
        checked={draft.isActive}
        onChange={(event) =>
          setDraft((current) => ({ ...current, isActive: event.target.checked }))
        }
      />
      <div>
        <CheckboxField
          label={t('productTypes.brewingGuide')}
          name="brewingGuide"
          checked={draft.brewingGuide}
          onChange={(event) =>
            setDraft((current) => ({ ...current, brewingGuide: event.target.checked }))
          }
        />
        <p className="mt-1 pl-8 text-helper text-fg-subtle">{t('productTypes.brewingGuideHint')}</p>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-title-sm text-forest-900">
          {t('productTypes.attributes')}
        </legend>
        {error('attributes') ? (
          <p className="text-helper font-medium text-danger">{error('attributes')}</p>
        ) : null}
        {draft.attributes.map((attribute, index) => {
          const used = attribute.usageCount > 0;
          const prefix = `attributes.${index}`;
          const choice = CHOICE.includes(attribute.kind);
          return (
            <div
              key={attribute.id ?? `new-${index}`}
              className="space-y-4 rounded-card border border-line bg-surface-muted/30 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-semibold text-forest-900">
                  {attribute.labels.uz.trim() ||
                    t('productTypes.attributeNumber', { index: index + 1 })}
                </p>
                <button
                  type="button"
                  disabled={used}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      attributes: current.attributes.filter((_, position) => position !== index),
                    }))
                  }
                  className={buttonClasses('danger-ghost', 'sm')}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                  {t('productTypes.removeAttribute')}
                </button>
              </div>
              {used ? (
                <p className="-mt-2 text-xs text-fg-subtle">
                  {t('productTypes.inUse', { count: attribute.usageCount })}
                </p>
              ) : null}
              <LabelFields
                name={`${prefix}.label`}
                label={t('productTypes.attributeLabel')}
                value={attribute.labels}
                onChange={(next) => setAttribute(index, { labels: next })}
                error={
                  error(`${prefix}.translations.uz.label`, attribute.labels.uz) ??
                  error(`${prefix}.key`, attribute.key)
                }
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField
                  label={t('productTypes.kind')}
                  name={`${prefix}.kind`}
                  required
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
                  hint={t('productTypes.unitHint')}
                  value={attribute.unit}
                  onChange={(event) => setAttribute(index, { unit: event.target.value })}
                />
              </div>
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
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
              {choice ? (
                <fieldset className="space-y-2 border-t border-line pt-4">
                  <legend className="text-label text-fg">{t('productTypes.options')}</legend>
                  <p className="text-helper text-fg-subtle">{t('productTypes.optionsHint')}</p>
                  {error(`${prefix}.options`) ? (
                    <p className="text-helper font-medium text-danger">
                      {error(`${prefix}.options`)}
                    </p>
                  ) : null}
                  {attribute.options.length > 0 ? (
                    <div
                      aria-hidden
                      className="hidden grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 text-caption font-semibold text-fg-subtle sm:grid"
                    >
                      {LANGUAGES.map((locale) => (
                        <span key={locale}>{t(`common.locales.${locale}`)}</span>
                      ))}
                    </div>
                  ) : null}
                  {attribute.options.map((option, optionIndex) => {
                    const optionError =
                      error(
                        `${prefix}.options.${optionIndex}.translations.uz.label`,
                        option.labels.uz,
                      ) ?? error(`${prefix}.options.${optionIndex}.key`, option.key);
                    return (
                      <div key={option.id ?? `new-${optionIndex}`}>
                        <div className="grid grid-cols-[1fr_2.5rem] gap-2 sm:grid-cols-[1fr_1fr_1fr_2.5rem]">
                          {LANGUAGES.map((locale) => (
                            <input
                              key={locale}
                              name={`${prefix}.options.${optionIndex}.${locale}`}
                              lang={locale === 'uz' ? 'uz-Latn' : locale}
                              aria-label={`${t('productTypes.optionLabel')} ${optionIndex + 1} · ${t(`common.locales.${locale}`)}`}
                              aria-invalid={locale === 'uz' && optionError ? true : undefined}
                              placeholder={
                                locale === 'uz' ? undefined : t(`common.locales.${locale}`)
                              }
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
                              className={inputClasses({
                                size: 'sm',
                                invalid: locale === 'uz' && Boolean(optionError),
                                className: locale === 'uz' ? '' : 'max-sm:col-start-1',
                              })}
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
                            className={iconButtonClasses(
                              'ghost',
                              'sm',
                              'self-center max-sm:col-start-2 max-sm:row-start-1',
                            )}
                            aria-label={`${t('productTypes.removeOption')}: ${option.labels.uz || optionIndex + 1}`}
                          >
                            <X aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
                        {optionError ? (
                          <p className="mt-1 text-helper font-medium text-danger">{optionError}</p>
                        ) : null}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setAttribute(index, {
                        options: [
                          ...attribute.options,
                          { key: '', keyAuto: true, labels: EMPTY_LABELS, usageCount: 0 },
                        ],
                      })
                    }
                    className={buttonClasses('ghost', 'sm')}
                  >
                    <Plus aria-hidden className="h-4 w-4" />
                    {t('productTypes.addOption')}
                  </button>
                </fieldset>
              ) : null}
              <details className="group rounded-control border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-body-sm font-semibold text-fg-muted [&::-webkit-details-marker]:hidden">
                  {t('common.advanced')}
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
                  <TextField
                    label={t('productTypes.attributeKey')}
                    name={`${prefix}.key`}
                    required
                    size="sm"
                    hint={t('productTypes.keysHint')}
                    value={attribute.key}
                    onChange={(event) =>
                      setAttribute(index, { key: event.target.value, keyAuto: false })
                    }
                    error={error(`${prefix}.key`, attribute.key)}
                  />
                  <TextField
                    label={t('productTypes.attributeHint')}
                    name={`${prefix}.hint`}
                    size="sm"
                    value={attribute.hint}
                    onChange={(event) => setAttribute(index, { hint: event.target.value })}
                  />
                </div>
              </details>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            update((current) => ({
              ...current,
              attributes: [
                ...current.attributes,
                {
                  key: '',
                  keyAuto: true,
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

      <details className="group rounded-control border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-body-sm font-semibold text-fg-muted [&::-webkit-details-marker]:hidden">
          {t('common.advanced')}
          <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
          <TextField
            label={t('productTypes.key')}
            name="key"
            required
            size="sm"
            hint={t('productTypes.keyHint')}
            value={draft.key}
            onChange={(event) =>
              setDraft((current) => ({ ...current, key: event.target.value, keyAuto: false }))
            }
            error={error('key', draft.key)}
          />
          <TextField
            label={t('common.position')}
            name="position"
            inputMode="numeric"
            size="sm"
            hint={t('common.positionHint')}
            value={draft.position}
            onChange={(event) =>
              setDraft((current) => ({ ...current, position: event.target.value }))
            }
            error={error('position', draft.position)}
          />
        </div>
      </details>

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <ApiAlert message={form.apiErrorMessage} />
        <SubmitButton
          sending={form.status === 'sending'}
          label={type ? t('common.save') : t('common.create')}
          sendingLabel={t('common.saving')}
        />
      </div>
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
                  <Cell primary>
                    <button
                      type="button"
                      onClick={() => setEditing(type)}
                      className="text-left font-semibold text-brand underline-offset-4 hover:underline"
                    >
                      {name(type)}
                    </button>
                  </Cell>
                  <Cell label={t('productTypes.attributes')} className="text-xs">
                    {type.attributes
                      .map(
                        (attribute) =>
                          `${attribute.translations[locale]?.label ?? attribute.translations.uz.label} (${t(`productTypes.kinds.${attribute.kind}`)})`,
                      )
                      .join(', ') || '—'}
                  </Cell>
                  <Cell label={t('taxonomy.products')} className="text-right tabular-nums">
                    {type.productCount}
                  </Cell>
                  <Cell label={t('common.status')}>
                    <span
                      className={type.isActive ? 'font-semibold text-success' : 'text-fg-subtle'}
                    >
                      {type.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </Cell>
                  <Cell className="text-right max-md:justify-end">
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
                  </Cell>
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
        wide
        title={editing === 'new' ? t('productTypes.new') : editing ? name(editing) : ''}
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
              if (!ok) return;
              setDeleting(null);
              notify(t('productTypes.deleted'));
            });
        }}
      />
    </>
  );
}
