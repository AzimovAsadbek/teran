'use client';

import {
  ILLUSTRATION_KEYS,
  taxonomyUpsertSchema,
  type AdminProductType,
  type AdminTaxonomy,
  type Locale,
} from '@teran/contracts';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/slugify';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { ImageUploader, renditionSrc } from './image-uploader';
import { ReadinessChecklist } from './readiness-checklist';
import { notify } from './toast';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';
import { Cell, table } from './table';
import { useAdminAction } from './use-admin-action';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';

const KEYS = ['name', 'description', 'body', 'seoTitle', 'seoDescription', 'imageAlt'] as const;
type Kind = 'categories' | 'collections';

function TaxonomyForm({
  kind,
  item,
  items,
  productTypes,
  onDone,
}: {
  kind: Kind;
  item: AdminTaxonomy | null;
  /** Every category, to choose a parent from. */
  items: AdminTaxonomy[];
  /** Categories: the product types new products can start with. */
  productTypes: AdminProductType[];
  onDone: () => void;
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [slug, setSlug] = useState(item?.slug ?? '');
  // A new category's address follows its name until staff edit the address themselves.
  const [slugAuto, setSlugAuto] = useState(item === null);
  const [position, setPosition] = useState(String(item?.position ?? 0));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [illustrationKey, setIllustrationKey] = useState<string>(item?.illustrationKey ?? '');
  const [parentId, setParentId] = useState<string>(item?.parentId ?? '');
  const [productTypeId, setProductTypeId] = useState<string>(item?.productTypeId ?? '');
  const locale = useLocale() as Locale;
  const typeName = (type: AdminProductType) =>
    type.translations[locale]?.name ?? type.translations.uz.name;
  // Two levels: a parent must be top-level, and a category with subcategories stays top-level.
  const parents = items.filter(
    (candidate) => candidate.parentId === null && candidate.id !== item?.id,
  );
  const canHaveParent = kind === 'categories' && (item?.childCount ?? 0) === 0;
  const [translations, setTranslations] = useState(() =>
    fromTranslation(item?.translations ?? null, KEYS),
  );
  const payload = {
    slug: slug.trim(),
    position: Number(position) || 0,
    isActive,
    illustrationKey: illustrationKey || null,
    parentId: kind === 'categories' && parentId ? parentId : null,
    ...(kind === 'categories' ? { productTypeId: productTypeId || null } : {}),
    translations: toTranslationPayload(translations),
  };
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);

  function setUzName(name: string) {
    setTranslations((current) => ({ ...current, uz: { ...current.uz, name } }));
    if (slugAuto) setSlug(slugify(name));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(taxonomyUpsertSchema, payload, (data) =>
      item
        ? apiRequest(`/admin/${kind}/${item.id}`, { method: 'PUT', body: data })
        : apiRequest(`/admin/${kind}`, { method: 'POST', body: data }),
    );
    if (saved) {
      notify(t('taxonomy.saved'));
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
      className="space-y-5 px-5 py-4"
    >
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      <div id="taxonomy-image" className="space-y-2">
        <p className="text-body-sm font-semibold text-fg">{t('taxonomy.cover')}</p>
        <ImageUploader
          image={item?.image ?? null}
          uploadPath={item ? `/admin/${kind}/${item.id}/image` : null}
          removePath={item ? `/admin/${kind}/${item.id}/image` : null}
          emptyText={t('taxonomy.coverEmpty')}
          hint={t('taxonomy.coverHint')}
          shape="square"
          disabledText={t('taxonomy.coverAfterSave')}
        />
      </div>
      <TextField
        label={t('products.name')}
        name="uz-name"
        lang="uz-Latn"
        required
        maxLength={100}
        value={translations.uz.name}
        onChange={(event) => setUzName(event.target.value)}
        error={error('translations.uz.name', translations.uz.name)}
        data-autofocus
      />
      {canHaveParent ? (
        <SelectField
          label={t('categories.parent')}
          name="parentId"
          hint={t('categories.parentHint')}
          options={[
            { value: '', label: t('categories.topLevel') },
            ...parents.map((candidate) => ({
              value: candidate.id,
              label: candidate.translations[locale]?.name ?? candidate.translations.uz.name,
            })),
          ]}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          error={error('parentId')}
        />
      ) : null}
      {kind === 'categories' ? (
        <SelectField
          label={t('categories.productType')}
          name="productTypeId"
          hint={t('categories.productTypeHint')}
          options={[
            { value: '', label: parentId ? t('categories.parentType') : t('productTypes.none') },
            ...productTypes
              .filter((type) => type.isActive || type.id === item?.productTypeId)
              .map((type) => ({ value: type.id, label: typeName(type) })),
          ]}
          value={productTypeId}
          onChange={(event) => setProductTypeId(event.target.value)}
          error={error('productTypeId')}
        />
      ) : null}
      <TextField
        label={t('common.slug')}
        name="slug"
        required
        size="sm"
        hint={t('common.slugHint')}
        value={slug}
        onChange={(event) => {
          setSlug(event.target.value);
          setSlugAuto(false);
        }}
        error={error('slug', slug)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('common.position')}
          name="position"
          inputMode="numeric"
          required
          hint={t('common.positionHint')}
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          error={error('position', position)}
        />
        <SelectField
          label={t('common.illustration')}
          name="illustrationKey"
          hint={t('common.illustrationHint')}
          options={[
            { value: '', label: t('common.noIllustration') },
            ...ILLUSTRATION_KEYS.map((key) => ({ value: key, label: t(`illustrations.${key}`) })),
          ]}
          value={illustrationKey}
          onChange={(event) => setIllustrationKey(event.target.value)}
        />
      </div>
      <CheckboxField
        label={t('common.active')}
        name="isActive"
        checked={isActive}
        onChange={(event) => setIsActive(event.target.checked)}
      />
      <TranslationEditor
        value={translations}
        onChange={setTranslations}
        error={error}
        skip={{ uz: ['name'] }}
        fields={[
          { key: 'name', label: t('products.name'), required: true, maxLength: 100 },
          {
            key: 'description',
            label: t('taxonomy.description'),
            multiline: true,
            rows: 3,
            maxLength: 1000,
          },
          ...(kind === 'categories'
            ? [
                {
                  key: 'body' as const,
                  label: t('categories.body'),
                  hint: t('categories.bodyHint'),
                  multiline: true,
                  rows: 6,
                  maxLength: 4000,
                },
              ]
            : []),
          { key: 'seoTitle', label: t('products.seoTitle'), maxLength: 70 },
          {
            key: 'seoDescription',
            label: t('products.seoDescription'),
            multiline: true,
            rows: 2,
            maxLength: 170,
          },
          {
            key: 'imageAlt',
            label: t('taxonomy.imageAlt'),
            hint: t('taxonomy.imageAltHint'),
            maxLength: 200,
          },
        ]}
      />
      {item ? (
        <ReadinessChecklist
          readiness={item.readiness}
          sections={{ image: 'taxonomy-image', description: 'taxonomy-image' }}
        />
      ) : null}
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={item ? t('common.save') : t('common.create')}
        sendingLabel={t('common.saving')}
      />
    </form>
  );
}

/** Categories and collections: ordered list, side-sheet editor and guarded deletion. */
export function TaxonomyManager({
  kind,
  items,
  productTypes = [],
}: {
  kind: Kind;
  items: AdminTaxonomy[];
  /** Categories: product types to choose each category's default from. */
  productTypes?: AdminProductType[];
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const action = useAdminAction();
  // The item is looked up again on every render, so a refreshed list (e.g. a new cover) shows at once.
  const [editing, setEditing] = useState<string | null>(null);
  const editingItem =
    editing && editing !== 'new' ? (items.find((item) => item.id === editing) ?? null) : null;
  const [deleting, setDeleting] = useState<AdminTaxonomy | null>(null);
  const name = (item: AdminTaxonomy) =>
    item.translations[locale]?.name ?? item.translations.uz.name;
  const newLabel = kind === 'categories' ? t('taxonomy.newCategory') : t('taxonomy.newCollection');
  // Each top-level category followed by its subcategories (collections have no parents).
  const ordered = items
    .filter((item) => item.parentId === null)
    .flatMap((top) => [top, ...items.filter((item) => item.parentId === top.id)]);
  const parentName = (id: string) => {
    const parent = items.find((item) => item.id === id);
    return parent ? name(parent) : '';
  };

  /** The item's public page, while the storefront shows it (active, under an active parent). */
  const publicHref = (item: AdminTaxonomy): string | null => {
    if (!item.isActive) return null;
    if (kind === 'collections') return `/collections/${item.slug}`;
    if (!item.parentId) return `/${item.slug}`;
    const parent = items.find((candidate) => candidate.id === item.parentId);
    return parent?.isActive ? `/${parent.slug}/${item.slug}` : null;
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={buttonClasses('primary')}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {newLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong/45 bg-surface px-6 py-12 text-center text-fg-subtle">
          {t('common.empty')}
        </p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('products.name')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('taxonomy.products')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('common.position')}
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
              {ordered.map((item) => {
                // A top-level category's products sit in its subcategories: count them too.
                const nested = items
                  .filter((child) => child.parentId === item.id)
                  .reduce((sum, child) => sum + child.productCount, 0);
                return (
                  <tr key={item.id}>
                    <Cell primary className="font-semibold">
                      {item.parentId ? (
                        <span className="pl-5 text-fg-muted" aria-hidden>
                          ↳{' '}
                        </span>
                      ) : null}
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- API rendition (ADR-009)
                        <img
                          src={renditionSrc(item.image, 320)}
                          alt=""
                          className="mr-2 inline-block h-8 w-8 rounded-full border border-line object-cover align-middle"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setEditing(item.id)}
                        className="text-left font-semibold text-brand underline-offset-4 hover:underline"
                      >
                        {name(item)}
                      </button>
                      {item.parentId ? (
                        <span className="sr-only">
                          {' '}
                          ({t('categories.subcategoryOf', { name: parentName(item.parentId) })})
                        </span>
                      ) : null}
                      {item.childCount > 0 ? (
                        <span className="ml-2 text-xs font-normal text-fg-subtle">
                          {t('categories.children', { count: item.childCount })}
                        </span>
                      ) : null}
                    </Cell>
                    <Cell label={t('taxonomy.products')} className="text-right tabular-nums">
                      {item.productCount + nested}
                      {nested > 0 ? (
                        <span className="block text-xs text-fg-subtle">
                          {t('taxonomy.withChildren')}
                        </span>
                      ) : null}
                      {item.productCount + nested === 0 && item.isActive ? (
                        <span className="block text-xs text-fg-subtle">
                          {t('taxonomy.emptyOnSite')}
                        </span>
                      ) : null}
                    </Cell>
                    <Cell label={t('common.position')} className="text-right tabular-nums">
                      {item.position}
                    </Cell>
                    <Cell label={t('common.status')}>
                      <span
                        className={item.isActive ? 'font-semibold text-success' : 'text-fg-subtle'}
                      >
                        {item.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </Cell>
                    <Cell className="text-right max-md:justify-end">
                      <span className="inline-flex gap-1">
                        {publicHref(item) ? (
                          <Link
                            href={publicHref(item)!}
                            target="_blank"
                            className={cn(iconButtonClasses('ghost', 'sm'), table.above)}
                            aria-label={`${t('taxonomy.viewOnSite')}: ${name(item)}`}
                            title={t('taxonomy.viewOnSite')}
                          >
                            <ExternalLink aria-hidden className="h-4 w-4" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setEditing(item.id)}
                          className={iconButtonClasses('ghost', 'sm')}
                          aria-label={`${t('common.edit')}: ${name(item)}`}
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          className={iconButtonClasses('danger', 'sm')}
                          aria-label={`${t('common.delete')}: ${name(item)}`}
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </span>
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        side="right"
        title={editing === 'new' ? newLabel : editingItem ? name(editingItem) : ''}
        closeLabel={tc('close')}
      >
        {editing !== null && (editing === 'new' || editingItem) ? (
          <TaxonomyForm
            key={editing}
            kind={kind}
            item={editingItem}
            items={items}
            productTypes={productTypes}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? t('taxonomy.deleteConfirm', { name: name(deleting) }) : ''}
        confirmLabel={t('common.delete')}
        tone="danger"
        pending={action.pending}
        error={
          action.error && kind === 'categories' && deleting?.productCount
            ? t('taxonomy.deleteBlocked')
            : action.error
        }
        onClose={() => {
          setDeleting(null);
          action.clearError();
        }}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          void action
            .run(() => apiRequest(`/admin/${kind}/${target.id}`, { method: 'DELETE' }))
            .then((ok) => {
              if (!ok) return;
              setDeleting(null);
              notify(t('taxonomy.deleted'));
            });
        }}
      />
    </>
  );
}
