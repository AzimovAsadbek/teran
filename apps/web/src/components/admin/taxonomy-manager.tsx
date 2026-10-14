'use client';

import {
  ILLUSTRATION_KEYS,
  taxonomyUpsertSchema,
  type AdminTaxonomy,
  type Locale,
} from '@teran/contracts';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';
import { table } from './ui';
import { useAdminAction } from './use-admin-action';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';

const KEYS = ['name', 'description', 'seoTitle', 'seoDescription'] as const;
type Kind = 'categories' | 'collections';

function TaxonomyForm({
  kind,
  item,
  onDone,
}: {
  kind: Kind;
  item: AdminTaxonomy | null;
  onDone: () => void;
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [position, setPosition] = useState(String(item?.position ?? 0));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [illustrationKey, setIllustrationKey] = useState<string>(item?.illustrationKey ?? '');
  const [translations, setTranslations] = useState(() =>
    fromTranslation(item?.translations ?? null, KEYS),
  );
  const error = (path: string, value?: string) => message(form.errors[path], value);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      slug: slug.trim(),
      position: Number(position) || 0,
      isActive,
      illustrationKey: illustrationKey || null,
      translations: toTranslationPayload(translations),
    };
    const saved = await form.submit(taxonomyUpsertSchema, payload, (data) =>
      item
        ? apiRequest(`/admin/${kind}/${item.id}`, { method: 'PUT', body: data })
        : apiRequest(`/admin/${kind}`, { method: 'POST', body: data }),
    );
    if (saved) {
      router.refresh();
      onDone();
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5 px-5 py-4">
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('common.slug')}
        name="slug"
        required
        hint={t('common.slugHint')}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
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
          options={[
            { value: '', label: t('common.noIllustration') },
            ...ILLUSTRATION_KEYS.map((key) => ({ value: key, label: key })),
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
        fields={[
          { key: 'name', label: t('products.name'), required: true, maxLength: 100 },
          {
            key: 'description',
            label: t('taxonomy.description'),
            multiline: true,
            rows: 3,
            maxLength: 1000,
          },
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
export function TaxonomyManager({ kind, items }: { kind: Kind; items: AdminTaxonomy[] }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const action = useAdminAction();
  const [editing, setEditing] = useState<AdminTaxonomy | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminTaxonomy | null>(null);
  const name = (item: AdminTaxonomy) =>
    item.translations[locale]?.name ?? item.translations.uz.name;
  const newLabel = kind === 'categories' ? t('taxonomy.newCategory') : t('taxonomy.newCollection');

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
                <th scope="col" className={table.th}>
                  {t('common.slug')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('common.position')}
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
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={`${table.td} font-semibold`}>{name(item)}</td>
                  <td className={`${table.td} font-mono text-xs`}>{item.slug}</td>
                  <td className={`${table.td} text-right tabular-nums`}>{item.position}</td>
                  <td className={`${table.td} text-right tabular-nums`}>{item.productCount}</td>
                  <td className={table.td}>
                    {item.isActive ? t('common.active') : t('common.inactive')}
                  </td>
                  <td className={`${table.td} text-right`}>
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
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
        title={editing === 'new' ? newLabel : editing ? name(editing) : ''}
        closeLabel={tc('close')}
      >
        {editing !== null ? (
          <TaxonomyForm
            key={editing === 'new' ? 'new' : editing.id}
            kind={kind}
            item={editing === 'new' ? null : editing}
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
              if (ok) setDeleting(null);
            });
        }}
      />
    </>
  );
}
