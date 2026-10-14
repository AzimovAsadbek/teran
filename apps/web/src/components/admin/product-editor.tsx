'use client';

import {
  CAFFEINE_LEVELS,
  ILLUSTRATION_KEYS,
  PRODUCT_FORMATS,
  PRODUCT_STATUSES,
  productUpsertSchema,
  type AdminProductDetail,
  type AdminProductType,
  type AdminTaxonomy,
  type Locale,
  type ProductAttributeInput,
} from '@teran/contracts';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';
import { buttonClasses } from '@/components/ui/button';
import {
  fromTranslation,
  toTranslationPayload,
  TranslationEditor,
  type LocalizedValue,
} from './translation-editor';

const TEXT_KEYS = [
  'name',
  'shortDescription',
  'description',
  'ingredients',
  'tastingNotes',
  'origin',
  'seoTitle',
  'seoDescription',
] as const;
type TextKey = (typeof TEXT_KEYS)[number];

interface VariantDraft {
  id?: string;
  sku: string;
  weightGrams: string;
  unitCount: string;
  price: string;
  compareAtPrice: string;
  lowStockThreshold: string;
  barcode: string;
  isActive: boolean;
  initialStock: string;
  stockQuantity?: number;
}

/** The editor's value of one attribute (only the field matching its kind is sent). */
interface AttributeDraft {
  optionIds: string[];
  number: string;
  boolean: '' | 'true' | 'false';
  text: { uz: string; ru: string; en: string };
}

const EMPTY_ATTRIBUTE: AttributeDraft = {
  optionIds: [],
  number: '',
  boolean: '',
  text: { uz: '', ru: '', en: '' },
};

interface Draft {
  slug: string;
  status: string;
  categoryId: string;
  productTypeId: string;
  attributes: Record<string, AttributeDraft>;
  format: string;
  isFeatured: boolean;
  caffeineLevel: string;
  brewTempCelsius: string;
  brewTimeMinSeconds: string;
  brewTimeMaxSeconds: string;
  brewAmountGrams: string;
  illustrationKey: string;
  collectionIds: string[];
  translations: LocalizedValue<Record<TextKey, string>>;
  variants: VariantDraft[];
}

const EMPTY_VARIANT: VariantDraft = {
  sku: '',
  weightGrams: '',
  unitCount: '',
  price: '',
  compareAtPrice: '',
  lowStockThreshold: '5',
  barcode: '',
  isActive: true,
  initialStock: '0',
};

function toAttributeDrafts(values: ProductAttributeInput[]): Record<string, AttributeDraft> {
  return Object.fromEntries(
    values.map((value) => [
      value.attributeId,
      {
        optionIds: value.optionIds ?? [],
        number: value.number === null || value.number === undefined ? '' : String(value.number),
        boolean:
          value.boolean === null || value.boolean === undefined
            ? ''
            : value.boolean
              ? 'true'
              : 'false',
        text: {
          uz: value.text?.uz ?? '',
          ru: value.text?.ru ?? '',
          en: value.text?.en ?? '',
        },
      } satisfies AttributeDraft,
    ]),
  );
}

function toDraft(product: AdminProductDetail | null, categories: AdminTaxonomy[]): Draft {
  return {
    slug: product?.slug ?? '',
    status: product?.status ?? 'DRAFT',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    productTypeId: product?.productTypeId ?? '',
    attributes: toAttributeDrafts(product?.attributes ?? []),
    format: product?.format ?? 'LOOSE_LEAF',
    isFeatured: product?.isFeatured ?? false,
    caffeineLevel: product?.caffeineLevel ?? '',
    brewTempCelsius: product?.brewTempCelsius?.toString() ?? '',
    brewTimeMinSeconds: product?.brewTimeMinSeconds?.toString() ?? '',
    brewTimeMaxSeconds: product?.brewTimeMaxSeconds?.toString() ?? '',
    brewAmountGrams: product?.brewAmountGrams?.toString() ?? '',
    illustrationKey: product?.illustrationKey ?? '',
    collectionIds: product?.collectionIds ?? [],
    translations: fromTranslation(product?.translations ?? null, TEXT_KEYS),
    variants: product
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          weightGrams: variant.weightGrams?.toString() ?? '',
          unitCount: variant.unitCount?.toString() ?? '',
          price: variant.price.replace(/\.00$/, ''),
          compareAtPrice: variant.compareAtPrice?.replace(/\.00$/, '') ?? '',
          lowStockThreshold: String(variant.lowStockThreshold),
          barcode: variant.barcode ?? '',
          isActive: variant.isActive,
          initialStock: '0',
          stockQuantity: variant.stockQuantity,
        }))
      : [{ ...EMPTY_VARIANT }],
  };
}

const numberOrNull = (value: string) =>
  value.trim() === '' ? null : Number(value.replace(',', '.'));
const money = (value: string) => value.replace(/[\s ]/g, '').replace(',', '.');

/** Values for the chosen type's attributes; attributes left empty are not sent. */
function attributePayload(
  draft: Draft,
  type: AdminProductType | undefined,
): ProductAttributeInput[] {
  if (!type) return [];
  return type.attributes.flatMap((attribute): ProductAttributeInput[] => {
    const value = draft.attributes[attribute.id] ?? EMPTY_ATTRIBUTE;
    switch (attribute.kind) {
      case 'SELECT':
      case 'MULTI_SELECT':
        return value.optionIds.length > 0
          ? [{ attributeId: attribute.id, optionIds: value.optionIds }]
          : [];
      case 'NUMBER': {
        const number = numberOrNull(value.number);
        return number === null ? [] : [{ attributeId: attribute.id, number }];
      }
      case 'BOOLEAN':
        return value.boolean === ''
          ? []
          : [{ attributeId: attribute.id, boolean: value.boolean === 'true' }];
      case 'TEXT':
        return value.text.uz.trim()
          ? [
              {
                attributeId: attribute.id,
                text: {
                  uz: value.text.uz.trim(),
                  ru: value.text.ru.trim() || undefined,
                  en: value.text.en.trim() || undefined,
                },
              },
            ]
          : [];
    }
  });
}

function toPayload(draft: Draft, types: AdminProductType[]) {
  const type = types.find((candidate) => candidate.id === draft.productTypeId);
  return {
    slug: draft.slug.trim(),
    status: draft.status,
    categoryId: draft.categoryId,
    productTypeId: type?.id ?? null,
    attributes: attributePayload(draft, type),
    format: draft.format,
    isFeatured: draft.isFeatured,
    caffeineLevel: draft.caffeineLevel || null,
    brewTempCelsius: numberOrNull(draft.brewTempCelsius),
    brewTimeMinSeconds: numberOrNull(draft.brewTimeMinSeconds),
    brewTimeMaxSeconds: numberOrNull(draft.brewTimeMaxSeconds),
    brewAmountGrams: numberOrNull(draft.brewAmountGrams),
    illustrationKey: draft.illustrationKey || null,
    collectionIds: draft.collectionIds,
    translations: toTranslationPayload(draft.translations),
    variants: draft.variants.map((variant) => ({
      ...(variant.id
        ? { id: variant.id }
        : { initialStock: numberOrNull(variant.initialStock) ?? 0 }),
      sku: variant.sku.trim().toUpperCase(),
      weightGrams: numberOrNull(variant.weightGrams),
      unitCount: numberOrNull(variant.unitCount),
      price: money(variant.price),
      compareAtPrice: variant.compareAtPrice.trim() ? money(variant.compareAtPrice) : null,
      lowStockThreshold: numberOrNull(variant.lowStockThreshold) ?? 0,
      barcode: variant.barcode.trim() || null,
      isActive: variant.isActive,
    })),
  };
}

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-body-lg font-semibold text-forest-900">{title}</h2>
        {hint ? <p className="mt-1 text-body-sm text-fg-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProductEditor({
  product,
  categories,
  collections,
  productTypes,
}: {
  product: AdminProductDetail | null;
  categories: AdminTaxonomy[];
  collections: AdminTaxonomy[];
  productTypes: AdminProductType[];
}) {
  const t = useTranslations('Admin');
  const tcat = useTranslations('Catalog');
  const tp = useTranslations('Product');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [draft, setDraft] = useState<Draft>(() => toDraft(product, categories));
  const name = (row: AdminTaxonomy) => row.translations[locale]?.name ?? row.translations.uz.name;
  // Subcategories are shown with their parent: "Tea › Green tea".
  const categoryLabel = (category: AdminTaxonomy) => {
    const parent = categories.find((candidate) => candidate.id === category.parentId);
    return parent ? `${name(parent)} › ${name(category)}` : name(category);
  };
  const selectableTypes = productTypes.filter(
    (type) => type.isActive || type.id === product?.productTypeId,
  );
  const currentType = productTypes.find((type) => type.id === draft.productTypeId);
  const label = (
    translations: { uz: { label: string } } & Partial<Record<Locale, { label: string } | null>>,
  ) => translations[locale]?.label ?? translations.uz.label;
  const setAttribute = (attributeId: string, patch: Partial<AttributeDraft>) =>
    setDraft((current) => ({
      ...current,
      attributes: {
        ...current.attributes,
        [attributeId]: { ...(current.attributes[attributeId] ?? EMPTY_ATTRIBUTE), ...patch },
      },
    }));
  const attributeErrors = Object.entries(form.errors)
    .filter(([path]) => path === 'attributes' || path.startsWith('attributes.'))
    .map(([, issue]) => issue);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setVariant = (index: number, patch: Partial<VariantDraft>) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, position) =>
        position === index ? { ...variant, ...patch } : variant,
      ),
    }));
  const error = (path: string, value?: string) => message(form.errors[path], value);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(draft, productTypes);
    if (product) {
      const saved = await form.submit(productUpsertSchema, payload, (data) =>
        apiRequest(`/admin/products/${product.id}`, { method: 'PUT', body: data }),
      );
      // The page reloads the product (new pack sizes get their ids) and shows the confirmation.
      if (saved) {
        router.replace(`/admin/products/${product.id}?saved=1`, { scroll: false });
        router.refresh();
      }
    } else {
      const created: { id?: string } = {};
      const saved = await form.submit(productUpsertSchema, payload, async (data) => {
        const product = await apiRequest<AdminProductDetail>('/admin/products', {
          method: 'POST',
          body: data,
        });
        created.id = product.id;
      });
      if (saved && created.id) router.replace(`/admin/products/${created.id}?created=1`);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"
    >
      <div className="space-y-6">
        <FormErrorSummary message={form.summary} />

        <Section title={t('products.variants')} hint={t('products.variantsHint')}>
          {error('variants') ? (
            <p className="text-body-sm font-medium text-danger">{error('variants')}</p>
          ) : null}
          <ol className="space-y-4">
            {draft.variants.map((variant, index) => (
              <li
                key={variant.id ?? `new-${index}`}
                className="rounded-card border border-line p-4"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    label={t('products.sku')}
                    name={`sku-${index}`}
                    required
                    value={variant.sku}
                    onChange={(event) => setVariant(index, { sku: event.target.value })}
                    error={error(`variants.${index}.sku`, variant.sku)}
                  />
                  <TextField
                    label={t('products.price')}
                    name={`price-${index}`}
                    required
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(event) => setVariant(index, { price: event.target.value })}
                    error={error(`variants.${index}.price`, variant.price)}
                  />
                  <TextField
                    label={t('products.compareAt')}
                    name={`compare-${index}`}
                    inputMode="decimal"
                    value={variant.compareAtPrice}
                    onChange={(event) => setVariant(index, { compareAtPrice: event.target.value })}
                    error={error(`variants.${index}.compareAtPrice`, variant.compareAtPrice)}
                  />
                  <TextField
                    label={t('products.weight')}
                    name={`weight-${index}`}
                    inputMode="numeric"
                    value={variant.weightGrams}
                    onChange={(event) => setVariant(index, { weightGrams: event.target.value })}
                    error={error(`variants.${index}.weightGrams`, variant.weightGrams)}
                  />
                  <TextField
                    label={t('products.units')}
                    name={`units-${index}`}
                    inputMode="numeric"
                    value={variant.unitCount}
                    onChange={(event) => setVariant(index, { unitCount: event.target.value })}
                    error={error(`variants.${index}.unitCount`, variant.unitCount)}
                  />
                  <TextField
                    label={t('products.lowStockThreshold')}
                    name={`threshold-${index}`}
                    required
                    inputMode="numeric"
                    value={variant.lowStockThreshold}
                    onChange={(event) =>
                      setVariant(index, { lowStockThreshold: event.target.value })
                    }
                    error={error(`variants.${index}.lowStockThreshold`, variant.lowStockThreshold)}
                  />
                  <TextField
                    label={t('products.barcode')}
                    name={`barcode-${index}`}
                    inputMode="numeric"
                    value={variant.barcode}
                    onChange={(event) => setVariant(index, { barcode: event.target.value })}
                    error={error(`variants.${index}.barcode`, variant.barcode)}
                  />
                  {variant.id ? (
                    <div>
                      <p className="mb-1.5 text-body-sm font-semibold text-forest-900">
                        {t('products.stock')}
                      </p>
                      <p className="flex h-12 items-center text-body-lg font-semibold tabular-nums">
                        {variant.stockQuantity}
                      </p>
                    </div>
                  ) : (
                    <TextField
                      label={t('products.initialStock')}
                      name={`initial-${index}`}
                      inputMode="numeric"
                      value={variant.initialStock}
                      onChange={(event) => setVariant(index, { initialStock: event.target.value })}
                      error={error(`variants.${index}.initialStock`, variant.initialStock)}
                    />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <CheckboxField
                    label={t('products.variantActive')}
                    name={`active-${index}`}
                    checked={variant.isActive}
                    onChange={(event) => setVariant(index, { isActive: event.target.checked })}
                  />
                  {draft.variants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'variants',
                          draft.variants.filter((_, position) => position !== index),
                        )
                      }
                      className="inline-flex items-center gap-2 text-body-sm font-semibold text-danger hover:underline"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      {t('products.removeVariant')}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => set('variants', [...draft.variants, { ...EMPTY_VARIANT }])}
            className={buttonClasses('secondary', 'sm')}
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t('products.addVariant')}
          </button>
        </Section>

        {currentType ? (
          <Section title={t('products.attributes')}>
            {attributeErrors.length > 0 ? (
              <p className="text-body-sm font-medium text-danger" role="alert">
                {attributeErrors
                  .map((issue) => {
                    const missing = currentType.attributes.find(
                      (attribute) => attribute.key === issue?.message,
                    );
                    return missing
                      ? `${label(missing.translations)}: ${t('productTypes.required')}`
                      : message(issue, undefined);
                  })
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            {currentType.attributes.length === 0 ? (
              <p className="text-body-sm text-fg-subtle">{t('products.noAttributes')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {currentType.attributes.map((attribute) => {
                  const value = draft.attributes[attribute.id] ?? EMPTY_ATTRIBUTE;
                  const title = `${label(attribute.translations)}${attribute.unit ? `, ${attribute.unit}` : ''}${attribute.isRequired ? ' *' : ''}`;
                  const hint = attribute.translations.uz.hint;
                  switch (attribute.kind) {
                    case 'SELECT':
                      return (
                        <SelectField
                          key={attribute.id}
                          label={title}
                          name={`attribute-${attribute.key}`}
                          hint={hint}
                          options={[
                            { value: '', label: t('products.notSet') },
                            ...attribute.options.map((option) => ({
                              value: option.id,
                              label: label(option.translations),
                            })),
                          ]}
                          value={value.optionIds[0] ?? ''}
                          onChange={(event) =>
                            setAttribute(attribute.id, {
                              optionIds: event.target.value ? [event.target.value] : [],
                            })
                          }
                        />
                      );
                    case 'MULTI_SELECT':
                      return (
                        <fieldset key={attribute.id} className="sm:col-span-2">
                          <legend className="mb-1.5 text-body-sm font-semibold text-forest-900">
                            {title}
                          </legend>
                          <div className="flex flex-wrap gap-x-5">
                            {attribute.options.map((option) => (
                              <CheckboxField
                                key={option.id}
                                label={label(option.translations)}
                                name={`attribute-${attribute.key}-${option.key}`}
                                checked={value.optionIds.includes(option.id)}
                                onChange={(event) =>
                                  setAttribute(attribute.id, {
                                    optionIds: event.target.checked
                                      ? [...value.optionIds, option.id]
                                      : value.optionIds.filter((id) => id !== option.id),
                                  })
                                }
                              />
                            ))}
                          </div>
                        </fieldset>
                      );
                    case 'NUMBER':
                      return (
                        <TextField
                          key={attribute.id}
                          label={title}
                          name={`attribute-${attribute.key}`}
                          hint={hint}
                          inputMode="decimal"
                          value={value.number}
                          onChange={(event) =>
                            setAttribute(attribute.id, { number: event.target.value })
                          }
                        />
                      );
                    case 'BOOLEAN':
                      return (
                        <SelectField
                          key={attribute.id}
                          label={title}
                          name={`attribute-${attribute.key}`}
                          hint={hint}
                          options={[
                            { value: '', label: t('products.notSet') },
                            { value: 'true', label: t('common.yes') },
                            { value: 'false', label: t('common.no') },
                          ]}
                          value={value.boolean}
                          onChange={(event) =>
                            setAttribute(attribute.id, {
                              boolean: event.target.value as AttributeDraft['boolean'],
                            })
                          }
                        />
                      );
                    case 'TEXT':
                      return (
                        <fieldset key={attribute.id} className="space-y-2 sm:col-span-2">
                          <legend className="text-body-sm font-semibold text-forest-900">
                            {title}
                          </legend>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {(['uz', 'ru', 'en'] as const).map((textLocale) => (
                              <TextField
                                key={textLocale}
                                label={t(
                                  `products.text${textLocale === 'uz' ? 'Uz' : textLocale === 'ru' ? 'Ru' : 'En'}`,
                                )}
                                name={`attribute-${attribute.key}-${textLocale}`}
                                size="sm"
                                maxLength={300}
                                value={value.text[textLocale]}
                                onChange={(event) =>
                                  setAttribute(attribute.id, {
                                    text: { ...value.text, [textLocale]: event.target.value },
                                  })
                                }
                              />
                            ))}
                          </div>
                        </fieldset>
                      );
                  }
                })}
              </div>
            )}
          </Section>
        ) : null}

        <Section title={t('products.texts')} hint={t('products.factsHint')}>
          <TranslationEditor
            value={draft.translations}
            onChange={(translations) => set('translations', translations)}
            error={error}
            fields={[
              { key: 'name', label: t('products.name'), required: true, maxLength: 150 },
              {
                key: 'shortDescription',
                label: t('products.shortDescription'),
                multiline: true,
                rows: 2,
                maxLength: 300,
              },
              {
                key: 'description',
                label: t('products.description'),
                multiline: true,
                rows: 6,
                maxLength: 5000,
              },
              {
                key: 'ingredients',
                label: t('products.ingredients'),
                multiline: true,
                rows: 2,
                maxLength: 1000,
              },
              {
                key: 'tastingNotes',
                label: t('products.tastingNotes'),
                multiline: true,
                rows: 2,
                maxLength: 500,
              },
              { key: 'origin', label: t('products.origin'), maxLength: 150 },
              { key: 'seoTitle', label: t('products.seoTitle'), maxLength: 70 },
              {
                key: 'seoDescription',
                label: t('products.seoDescription'),
                multiline: true,
                rows: 2,
                maxLength: 170,
              },
            ]}
          />
        </Section>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6">
        <Section title={t('products.basics')}>
          <SelectField
            label={t('common.status')}
            name="status"
            required
            options={PRODUCT_STATUSES.map((status) => ({
              value: status,
              label: t(`productStatus.${status}`),
            }))}
            value={draft.status}
            onChange={(event) => set('status', event.target.value)}
          />
          <TextField
            label={t('common.slug')}
            name="slug"
            required
            hint={t('common.slugHint')}
            value={draft.slug}
            onChange={(event) => set('slug', event.target.value)}
            error={error('slug', draft.slug)}
          />
          <SelectField
            label={t('products.category')}
            name="categoryId"
            required
            options={categories.map((category) => ({
              value: category.id,
              label: categoryLabel(category),
            }))}
            value={draft.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
            error={error('categoryId')}
          />
          <SelectField
            label={t('products.productType')}
            name="productTypeId"
            hint={t('products.productTypeHint')}
            options={[
              { value: '', label: t('productTypes.none') },
              ...selectableTypes.map((type) => ({
                value: type.id,
                label: type.translations[locale]?.name ?? type.translations.uz.name,
              })),
            ]}
            value={draft.productTypeId}
            onChange={(event) => set('productTypeId', event.target.value)}
            error={error('productTypeId')}
          />
          <SelectField
            label={t('products.format')}
            name="format"
            required
            options={PRODUCT_FORMATS.map((format) => ({
              value: format,
              label: tcat(`formats.${format}`),
            }))}
            value={draft.format}
            onChange={(event) => set('format', event.target.value)}
          />
          <SelectField
            label={t('products.caffeine')}
            name="caffeineLevel"
            options={[
              { value: '', label: t('products.caffeineUnknown') },
              ...CAFFEINE_LEVELS.map((level) => ({
                value: level,
                label: tp(`caffeineLevels.${level}`),
              })),
            ]}
            value={draft.caffeineLevel}
            onChange={(event) => set('caffeineLevel', event.target.value)}
          />
          <SelectField
            label={t('common.illustration')}
            name="illustrationKey"
            options={[
              { value: '', label: t('common.noIllustration') },
              ...ILLUSTRATION_KEYS.map((key) => ({ value: key, label: key })),
            ]}
            value={draft.illustrationKey}
            onChange={(event) => set('illustrationKey', event.target.value)}
          />
          <CheckboxField
            label={t('products.featured')}
            name="isFeatured"
            checked={draft.isFeatured}
            onChange={(event) => set('isFeatured', event.target.checked)}
          />
        </Section>

        <Section title={t('products.brewing')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <TextField
              label={t('products.brewTemp')}
              name="brewTemp"
              inputMode="numeric"
              value={draft.brewTempCelsius}
              onChange={(event) => set('brewTempCelsius', event.target.value)}
              error={error('brewTempCelsius', draft.brewTempCelsius)}
            />
            <TextField
              label={t('products.brewAmount')}
              name="brewAmount"
              inputMode="decimal"
              value={draft.brewAmountGrams}
              onChange={(event) => set('brewAmountGrams', event.target.value)}
              error={error('brewAmountGrams', draft.brewAmountGrams)}
            />
            <TextField
              label={t('products.brewTimeMin')}
              name="brewTimeMin"
              inputMode="numeric"
              value={draft.brewTimeMinSeconds}
              onChange={(event) => set('brewTimeMinSeconds', event.target.value)}
              error={error('brewTimeMinSeconds', draft.brewTimeMinSeconds)}
            />
            <TextField
              label={t('products.brewTimeMax')}
              name="brewTimeMax"
              inputMode="numeric"
              value={draft.brewTimeMaxSeconds}
              onChange={(event) => set('brewTimeMaxSeconds', event.target.value)}
              error={error('brewTimeMaxSeconds', draft.brewTimeMaxSeconds)}
            />
          </div>
        </Section>

        {collections.length > 0 ? (
          <Section title={t('products.collections')}>
            <div className="space-y-2">
              {collections.map((collection) => (
                <CheckboxField
                  key={collection.id}
                  label={name(collection)}
                  name={`collection-${collection.id}`}
                  checked={draft.collectionIds.includes(collection.id)}
                  onChange={(event) =>
                    set(
                      'collectionIds',
                      event.target.checked
                        ? [...draft.collectionIds, collection.id]
                        : draft.collectionIds.filter((id) => id !== collection.id),
                    )
                  }
                />
              ))}
            </div>
          </Section>
        ) : null}

        <div className="space-y-3 rounded-card border border-line bg-surface p-5">
          <ApiAlert message={form.apiErrorMessage} />
          <SubmitButton
            sending={form.status === 'sending'}
            label={product ? t('common.save') : t('common.create')}
            sendingLabel={t('common.saving')}
          />
          {product && product.status === 'ACTIVE' ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="flex items-center justify-center gap-1.5 text-body-sm font-semibold text-forest-900 hover:underline"
            >
              {t('products.openInStore')}
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
