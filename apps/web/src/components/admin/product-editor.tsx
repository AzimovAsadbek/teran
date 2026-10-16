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
  type TelegramMode,
} from '@teran/contracts';
import { Eye, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { buttonClasses } from '@/components/ui/button';
import {
  CheckboxField,
  FormErrorSummary,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { slugify, suggestSku } from '@/lib/slugify';
import { useValidationMessage } from '@/lib/use-validation-message';
import { useAdminErrorMessage } from './admin-errors';
import { ReadinessChecklist } from './readiness-checklist';
import { TelegramPanel } from './telegram-panel';
import { notify } from './toast';
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
  /** A new pack's code follows the product name and size until staff type their own. */
  skuAuto: boolean;
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
  /** A new product's address follows its name until staff edit the address themselves. */
  slugAuto: boolean;
  status: string;
  categoryId: string;
  productTypeId: string;
  /** A new product's type follows its category's default until staff choose a type themselves. */
  typeAuto: boolean;
  attributes: Record<string, AttributeDraft>;
  format: string;
  /** A new product's format follows its type until staff choose a format themselves. */
  formatAuto: boolean;
  isFeatured: boolean;
  caffeineLevel: string;
  brewTempCelsius: string;
  /** Steeping times are typed in minutes (as printed on the packs) and stored in seconds. */
  brewTimeMinMinutes: string;
  brewTimeMaxMinutes: string;
  brewAmountGrams: string;
  illustrationKey: string;
  collectionIds: string[];
  announceOnTelegram: boolean;
  translations: LocalizedValue<Record<TextKey, string>>;
  variants: VariantDraft[];
}

const EMPTY_VARIANT: VariantDraft = {
  sku: '',
  skuAuto: true,
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

const toMinutes = (seconds: number | null | undefined) =>
  seconds === null || seconds === undefined ? '' : String(Math.round((seconds / 60) * 100) / 100);

function toDraft(product: AdminProductDetail | null): Draft {
  return {
    slug: product?.slug ?? '',
    slugAuto: product === null,
    status: product?.status ?? 'DRAFT',
    // A new product starts without a category: staff choose it (nothing is silently pre-set).
    categoryId: product?.categoryId ?? '',
    productTypeId: product?.productTypeId ?? '',
    typeAuto: product === null,
    attributes: toAttributeDrafts(product?.attributes ?? []),
    format: product?.format ?? 'LOOSE_LEAF',
    formatAuto: product === null,
    isFeatured: product?.isFeatured ?? false,
    caffeineLevel: product?.caffeineLevel ?? '',
    brewTempCelsius: product?.brewTempCelsius?.toString() ?? '',
    brewTimeMinMinutes: toMinutes(product?.brewTimeMinSeconds),
    brewTimeMaxMinutes: toMinutes(product?.brewTimeMaxSeconds),
    brewAmountGrams: product?.brewAmountGrams?.toString() ?? '',
    illustrationKey: product?.illustrationKey ?? '',
    collectionIds: product?.collectionIds ?? [],
    announceOnTelegram: product?.announceOnTelegram ?? false,
    translations: fromTranslation(product?.translations ?? null, TEXT_KEYS),
    variants: product
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          skuAuto: false,
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

/** Fills the values that follow the name: the address of a new product and new pack codes. */
function withAuto(draft: Draft): Draft {
  const name = draft.translations.uz.name;
  const taken = new Set(
    draft.variants
      .filter((variant) => !variant.skuAuto)
      .map((variant) => variant.sku.trim().toUpperCase()),
  );
  const variants = draft.variants.map((variant) => {
    if (!variant.skuAuto) return variant;
    const sku = name.trim()
      ? suggestSku(name, variant.weightGrams || variant.unitCount, taken)
      : '';
    taken.add(sku);
    return sku === variant.sku ? variant : { ...variant, sku };
  });
  return { ...draft, slug: draft.slugAuto ? slugify(name) : draft.slug, variants };
}

const numberOrNull = (value: string) =>
  value.trim() === '' ? null : Number(value.replace(',', '.'));
const money = (value: string) => value.replace(/[\s ]/g, '').replace(',', '.');
const toSeconds = (minutes: string) => {
  const value = numberOrNull(minutes);
  return value === null ? null : Math.round(value * 60);
};

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
    brewTimeMinSeconds: toSeconds(draft.brewTimeMinMinutes),
    brewTimeMaxSeconds: toSeconds(draft.brewTimeMaxMinutes),
    brewAmountGrams: numberOrNull(draft.brewAmountGrams),
    illustrationKey: draft.illustrationKey || null,
    collectionIds: draft.collectionIds,
    announceOnTelegram: draft.announceOnTelegram,
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

function Section({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <div>
        <h2 className="text-body-lg font-semibold text-forest-900">{title}</h2>
        {hint ? <p className="mt-1 text-body-sm text-fg-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Product form in the order staff fill it: name, category and status first, then photos, pack
 * sizes and prices, descriptions, brewing, and the optional details. The save bar stays at the
 * bottom of the screen and says when something is not saved yet; errors disappear as soon as the
 * field is corrected.
 */
export function ProductEditor({
  product,
  categories,
  collections,
  productTypes,
  images,
  telegram,
}: {
  product: AdminProductDetail | null;
  categories: AdminTaxonomy[];
  collections: AdminTaxonomy[];
  productTypes: AdminProductType[];
  /** The photo manager (existing products only: photos are added after the first save). */
  images?: ReactNode;
  /** How the channel is configured (announcements are switched per product). */
  telegram: { mode: TelegramMode; channel: string | null };
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const tcat = useTranslations('Catalog');
  const tp = useTranslations('Product');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const message = useValidationMessage();
  const explain = useAdminErrorMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [draft, setDraft] = useState<Draft>(() => withAuto(toDraft(product)));
  const [initialPayload] = useState(() =>
    JSON.stringify(toPayload(withAuto(toDraft(product)), productTypes)),
  );
  const payload = toPayload(draft, productTypes);
  const dirty = JSON.stringify(payload) !== initialPayload;
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);

  // Leaving the page (reload, closing the tab) with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

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
  // Brewing and caffeine belong to some kinds of product only (the type says which); a product
  // without a type, or one that already has such values, keeps the fields.
  const hasBrewing = [
    draft.brewTempCelsius,
    draft.brewAmountGrams,
    draft.brewTimeMinMinutes,
    draft.brewTimeMaxMinutes,
    draft.caffeineLevel,
  ].some((value) => value.trim() !== '');
  const showBrewing = !currentType || currentType.brewingGuide || hasBrewing;

  /** The type a new product starts with: its category's default, else the parent category's. */
  const defaultTypeFor = (categoryId: string): string => {
    const category = categories.find((candidate) => candidate.id === categoryId);
    const parent = categories.find((candidate) => candidate.id === category?.parentId);
    const typeId = category?.productTypeId ?? parent?.productTypeId ?? '';
    return selectableTypes.some((type) => type.id === typeId) ? typeId : '';
  };
  /**
   * Sets the type and, while staff have not chosen a format, a matching one: a kind of product
   * without brewing guidance starts with no tea format ("Other": nothing is shown), never as
   * loose-leaf tea.
   */
  const withType = (current: Draft, productTypeId: string, typeAuto: boolean): Draft => {
    const type = productTypes.find((candidate) => candidate.id === productTypeId);
    return {
      ...current,
      productTypeId,
      typeAuto,
      format: current.formatAuto
        ? type && !type.brewingGuide
          ? 'OTHER'
          : 'LOOSE_LEAF'
        : current.format,
    };
  };
  const chooseCategory = (categoryId: string) =>
    setDraft((current) =>
      withAuto(
        current.typeAuto
          ? withType({ ...current, categoryId }, defaultTypeFor(categoryId), true)
          : { ...current, categoryId },
      ),
    );
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
  const attributeErrors = Object.entries(visible)
    .filter(([path]) => path === 'attributes' || path.startsWith('attributes.'))
    .map(([, issue]) => issue);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => withAuto({ ...current, [key]: value }));
  const setUz = (key: TextKey, text: string) =>
    setDraft((current) =>
      withAuto({
        ...current,
        translations: {
          ...current.translations,
          uz: { ...current.translations.uz, [key]: text },
        },
      }),
    );
  const setVariant = (index: number, patch: Partial<VariantDraft>) =>
    setDraft((current) =>
      withAuto({
        ...current,
        variants: current.variants.map((variant, position) =>
          position === index ? { ...variant, ...patch } : variant,
        ),
      }),
    );
  const brewTimeError = (path: string, value: string) => {
    const issue = visible[path];
    if (!issue) return undefined;
    return issue.code === 'too_small' || issue.code === 'too_big'
      ? t('products.brewTimeRange')
      : message(issue, value);
  };
  const pricePreview = (value: string) => {
    const amount = Number(money(value));
    return value.trim() && Number.isFinite(amount) && amount > 0
      ? t('products.pricePreview', {
          price: formatMoney(String(amount), locale, tc('currency.UZS')),
        })
      : undefined;
  };
  const uz = draft.translations.uz;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (product) {
      const saved = await form.submit(productUpsertSchema, payload, (data) =>
        apiRequest(`/admin/products/${product.id}`, { method: 'PUT', body: data }),
      );
      // The page reloads the product (new pack sizes get their ids); the editor starts afresh.
      if (saved) {
        notify(t('common.saved'));
        router.refresh();
      }
    } else {
      const created: { id?: string } = {};
      const saved = await form.submit(productUpsertSchema, payload, async (data) => {
        const result = await apiRequest<AdminProductDetail>('/admin/products', {
          method: 'POST',
          body: data,
        });
        created.id = result.id;
      });
      if (saved && created.id) {
        notify(t('products.created'));
        router.replace(`/admin/products/${created.id}?created=1`);
      }
    }
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="space-y-6">
          <Section id="section-basics" title={t('products.basics')}>
            <TextField
              label={t('products.name')}
              name="uz-name"
              lang="uz-Latn"
              required
              maxLength={150}
              hint={t('products.nameHint')}
              value={uz.name}
              onChange={(event) => setUz('name', event.target.value)}
              error={error('translations.uz.name', uz.name)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={t('products.category')}
                name="categoryId"
                required
                placeholder={t('products.chooseCategory')}
                options={categories.map((category) => ({
                  value: category.id,
                  label: categoryLabel(category),
                }))}
                value={draft.categoryId}
                onChange={(event) => chooseCategory(event.target.value)}
                error={visible.categoryId ? t('products.chooseCategory') : undefined}
              />
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
            </div>
            <p className="-mt-2 text-helper text-fg-subtle">{t('products.statusHint')}</p>
            <TextField
              label={t('common.slug')}
              name="slug"
              required
              size="sm"
              hint={t('common.slugHint')}
              value={draft.slug}
              onChange={(event) =>
                setDraft((current) => ({ ...current, slug: event.target.value, slugAuto: false }))
              }
              error={error('slug', draft.slug)}
            />
          </Section>

          <Section id="section-images" title={t('products.images')}>
            {images ?? (
              <p className="text-body-sm text-fg-muted">{t('products.imagesAfterSave')}</p>
            )}
          </Section>

          <Section
            id="section-variants"
            title={t('products.variants')}
            hint={t('products.variantsHint')}
          >
            {error('variants') ? (
              <p className="text-body-sm font-medium text-danger">{error('variants')}</p>
            ) : null}
            <ol className="space-y-4">
              {draft.variants.map((variant, index) => (
                <li
                  key={variant.id ?? `new-${index}`}
                  className="rounded-card border border-line p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <TextField
                      label={t('products.weight')}
                      name={`weight-${index}`}
                      inputMode="numeric"
                      value={variant.weightGrams}
                      onChange={(event) => setVariant(index, { weightGrams: event.target.value })}
                      error={error(`variants.${index}.weightGrams`, variant.weightGrams)}
                    />
                    <TextField
                      label={t('products.price')}
                      name={`price-${index}`}
                      required
                      inputMode="decimal"
                      placeholder="85 000"
                      hint={pricePreview(variant.price)}
                      value={variant.price}
                      onChange={(event) => setVariant(index, { price: event.target.value })}
                      error={error(`variants.${index}.price`, variant.price)}
                    />
                    <TextField
                      label={t('products.compareAt')}
                      name={`compare-${index}`}
                      inputMode="decimal"
                      hint={t('products.compareAtHint')}
                      value={variant.compareAtPrice}
                      onChange={(event) =>
                        setVariant(index, { compareAtPrice: event.target.value })
                      }
                      error={error(`variants.${index}.compareAtPrice`, variant.compareAtPrice)}
                    />
                    <TextField
                      label={t('products.sku')}
                      name={`sku-${index}`}
                      required
                      hint={variant.id ? undefined : t('products.skuHint')}
                      className="sm:col-span-2"
                      value={variant.sku}
                      onChange={(event) =>
                        setVariant(index, { sku: event.target.value, skuAuto: false })
                      }
                      error={error(`variants.${index}.sku`, variant.sku)}
                    />
                    {variant.id ? (
                      <div>
                        <p className="mb-2 text-label text-fg">{t('products.stock')}</p>
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
                        onChange={(event) =>
                          setVariant(index, { initialStock: event.target.value })
                        }
                        error={error(`variants.${index}.initialStock`, variant.initialStock)}
                      />
                    )}
                    <TextField
                      label={t('products.lowStockThreshold')}
                      name={`threshold-${index}`}
                      required
                      inputMode="numeric"
                      hint={t('products.lowStockThresholdHint')}
                      value={variant.lowStockThreshold}
                      onChange={(event) =>
                        setVariant(index, { lowStockThreshold: event.target.value })
                      }
                      error={error(
                        `variants.${index}.lowStockThreshold`,
                        variant.lowStockThreshold,
                      )}
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
                      label={t('products.barcode')}
                      name={`barcode-${index}`}
                      inputMode="numeric"
                      value={variant.barcode}
                      onChange={(event) => setVariant(index, { barcode: event.target.value })}
                      error={error(`variants.${index}.barcode`, variant.barcode)}
                    />
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
                        className="inline-flex min-h-10 items-center gap-2 text-body-sm font-semibold text-danger hover:underline"
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

          <Section id="section-texts" title={t('products.texts')} hint={t('products.factsHint')}>
            <TextAreaField
              label={t('products.shortDescription')}
              name="uz-shortDescription"
              lang="uz-Latn"
              rows={2}
              maxLength={300}
              value={uz.shortDescription}
              onChange={(event) => setUz('shortDescription', event.target.value)}
              error={error('translations.uz.shortDescription', uz.shortDescription)}
            />
            <TextAreaField
              label={t('products.description')}
              name="uz-description"
              lang="uz-Latn"
              rows={6}
              maxLength={5000}
              value={uz.description}
              onChange={(event) => setUz('description', event.target.value)}
              error={error('translations.uz.description', uz.description)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextAreaField
                label={t('products.ingredients')}
                name="uz-ingredients"
                lang="uz-Latn"
                rows={2}
                maxLength={1000}
                value={uz.ingredients}
                onChange={(event) => setUz('ingredients', event.target.value)}
                error={error('translations.uz.ingredients', uz.ingredients)}
              />
              <TextAreaField
                label={t('products.tastingNotes')}
                name="uz-tastingNotes"
                lang="uz-Latn"
                rows={2}
                maxLength={500}
                value={uz.tastingNotes}
                onChange={(event) => setUz('tastingNotes', event.target.value)}
                error={error('translations.uz.tastingNotes', uz.tastingNotes)}
              />
            </div>
            <TextField
              label={t('products.origin')}
              name="uz-origin"
              lang="uz-Latn"
              maxLength={150}
              value={uz.origin}
              onChange={(event) => setUz('origin', event.target.value)}
              error={error('translations.uz.origin', uz.origin)}
            />
            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-body font-semibold text-forest-900">
                {t('products.otherLanguages')}
              </h3>
              <TranslationEditor
                locales={['ru', 'en']}
                note={t('products.otherLanguagesHint')}
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
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          {product ? (
            <ReadinessChecklist
              readiness={product.readiness}
              sections={{
                name: 'section-basics',
                category: 'section-basics',
                slug: 'section-basics',
                images: 'section-images',
                variants: 'section-variants',
                attributes: 'section-attributes',
                shortDescription: 'section-texts',
                translations: 'section-texts',
                seo: 'section-extra',
              }}
            />
          ) : null}
          <TelegramPanel
            entity="product"
            entityId={product?.id ?? null}
            enabled={draft.announceOnTelegram}
            onEnabledChange={(value) => set('announceOnTelegram', value)}
            status={product?.telegram ?? null}
            mode={telegram.mode}
            channel={telegram.channel}
          />
          {showBrewing ? (
            <Section title={t('products.brewing')}>
              <div className="grid gap-4 sm:grid-cols-2">
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
                  inputMode="decimal"
                  value={draft.brewTimeMinMinutes}
                  onChange={(event) => set('brewTimeMinMinutes', event.target.value)}
                  error={brewTimeError('brewTimeMinSeconds', draft.brewTimeMinMinutes)}
                />
                <TextField
                  label={t('products.brewTimeMax')}
                  name="brewTimeMax"
                  inputMode="decimal"
                  value={draft.brewTimeMaxMinutes}
                  onChange={(event) => set('brewTimeMaxMinutes', event.target.value)}
                  error={brewTimeError('brewTimeMaxSeconds', draft.brewTimeMaxMinutes)}
                />
              </div>
              <p className="text-helper text-fg-subtle">{t('products.brewTimeHint')}</p>
            </Section>
          ) : null}

          <Section id="section-attributes" title={t('products.attributes')}>
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
              onChange={(event) => {
                const productTypeId = event.target.value;
                setDraft((current) => withAuto(withType(current, productTypeId, false)));
              }}
              error={error('productTypeId')}
            />
            {attributeErrors.length > 0 && currentType ? (
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
            {currentType && currentType.attributes.length === 0 ? (
              <p className="text-body-sm text-fg-subtle">{t('products.noAttributes')}</p>
            ) : null}
            {currentType && currentType.attributes.length > 0 ? (
              <div className="grid gap-4">
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
                        <fieldset key={attribute.id}>
                          <legend className="mb-1.5 text-body-sm font-semibold text-forest-900">
                            {title}
                          </legend>
                          <div className="flex flex-wrap gap-x-5 gap-y-1">
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
                        <fieldset key={attribute.id} className="space-y-2">
                          <legend className="text-body-sm font-semibold text-forest-900">
                            {title}
                          </legend>
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
                        </fieldset>
                      );
                  }
                })}
              </div>
            ) : null}
          </Section>

          <Section id="section-extra" title={t('products.extra')} hint={t('products.extraHint')}>
            <CheckboxField
              label={t('products.featured')}
              name="isFeatured"
              checked={draft.isFeatured}
              onChange={(event) => set('isFeatured', event.target.checked)}
            />
            {collections.length > 0 ? (
              <fieldset>
                <legend className="mb-2 text-label text-fg">{t('products.collections')}</legend>
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
              </fieldset>
            ) : null}
            <SelectField
              label={t('products.format')}
              name="format"
              required
              options={PRODUCT_FORMATS.map((format) => ({
                value: format,
                label: format === 'OTHER' ? t('products.formatOther') : tcat(`formats.${format}`),
              }))}
              value={draft.format}
              onChange={(event) => {
                const format = event.target.value;
                setDraft((current) => withAuto({ ...current, format, formatAuto: false }));
              }}
            />
            {showBrewing ? (
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
            ) : null}
            <SelectField
              label={t('common.illustration')}
              name="illustrationKey"
              hint={t('common.illustrationHint')}
              options={[
                { value: '', label: t('common.noIllustration') },
                ...ILLUSTRATION_KEYS.map((key) => ({
                  value: key,
                  label: t(`illustrations.${key}`),
                })),
              ]}
              value={draft.illustrationKey}
              onChange={(event) => set('illustrationKey', event.target.value)}
            />
            <TextField
              label={t('products.seoTitle')}
              name="uz-seoTitle"
              lang="uz-Latn"
              maxLength={70}
              value={uz.seoTitle}
              onChange={(event) => setUz('seoTitle', event.target.value)}
              error={error('translations.uz.seoTitle', uz.seoTitle)}
            />
            <TextAreaField
              label={t('products.seoDescription')}
              name="uz-seoDescription"
              lang="uz-Latn"
              rows={2}
              maxLength={170}
              hint={t('products.seoHint')}
              value={uz.seoDescription}
              onChange={(event) => setUz('seoDescription', event.target.value)}
              error={error('translations.uz.seoDescription', uz.seoDescription)}
            />
          </Section>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-12px_24px_-20px_rgb(0_0_0/0.35)] backdrop-blur-sm sm:-mx-8 sm:px-8">
        <ApiAlert message={explain(form.apiError) ?? form.apiErrorMessage} />
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 pt-0.5">
          <p className="mr-auto flex items-center gap-2 text-body-sm text-fg-muted">
            {dirty ? (
              <>
                <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
                {t('common.unsaved')}
              </>
            ) : draft.status === 'DRAFT' ? (
              t('products.saveDraftHint')
            ) : null}
          </p>
          {product ? (
            <Link
              href={`/admin/products/${product.id}/preview`}
              target="_blank"
              className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-forest-900 hover:underline"
            >
              <Eye aria-hidden className="h-3.5 w-3.5" />
              {t('preview.open')}
            </Link>
          ) : null}
          {product && product.status === 'ACTIVE' ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-forest-900 hover:underline"
            >
              {t('products.openInStore')}
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          <SubmitButton
            sending={form.status === 'sending'}
            label={product ? t('common.save') : t('common.create')}
            sendingLabel={t('common.saving')}
            className="min-w-40"
          />
        </div>
      </div>
    </form>
  );
}
