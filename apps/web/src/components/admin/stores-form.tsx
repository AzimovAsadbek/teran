'use client';

import {
  LOCALES,
  STORE_KINDS,
  storesSettingSchema,
  type Locale,
  type StoreKind,
  type StoresSetting,
} from '@teran/contracts';
import { ArrowDown, ArrowUp, MapPin, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton, SuccessMessage } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, TextAreaField, TextField } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';

type LocalizedText = Record<Locale, string>;
const emptyText = (): LocalizedText => ({ uz: '', ru: '', en: '' });

interface StoreDraft {
  id: string;
  name: string;
  address: LocalizedText;
  hours: LocalizedText;
  phone: string;
  /** "latitude, longitude", as map services copy them. */
  coordinates: string;
  kinds: StoreKind[];
  active: boolean;
}

function toDraft(store: StoresSetting[number]): StoreDraft {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    hours: store.hours ?? emptyText(),
    phone: store.phone ?? '',
    coordinates: `${store.latitude}, ${store.longitude}`,
    kinds: store.kinds,
    active: store.active,
  };
}

/** "41.31, 69.24" (or with a space or semicolon) as numbers; NaN when it is not that. */
function parseCoordinates(text: string): [number, number] {
  const parts = text
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  return parts.length === 2
    ? [parts[0] ?? Number.NaN, parts[1] ?? Number.NaN]
    : [Number.NaN, Number.NaN];
}

function toSetting(drafts: StoreDraft[]): StoresSetting {
  return drafts.map((draft) => {
    const [latitude, longitude] = parseCoordinates(draft.coordinates);
    const hours = LOCALES.every((locale) => draft.hours[locale].trim() === '') ? null : draft.hours;
    return {
      id: draft.id,
      name: draft.name.trim(),
      address: draft.address,
      hours,
      phone: draft.phone.trim() === '' ? null : draft.phone.trim(),
      latitude,
      longitude,
      kinds: draft.kinds,
      active: draft.active,
    };
  });
}

/**
 * The store locator's points of sale (Settings → Stores): one card per store with its name, its
 * address and opening hours in the three languages, a phone, the place on the map as the
 * "latitude, longitude" a map service copies, its kinds and whether it is shown. Stores can be
 * added, removed and reordered (the storefront lists them in this order); one save sends them all.
 * Their pictures are set under Page pictures once saved.
 */
export function StoresForm({ value }: { value: StoresSetting }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [drafts, setDrafts] = useState<StoreDraft[]>(() => value.map(toDraft));

  const payload = toSetting(drafts);
  const visible = form.errorsFor(payload);
  const update = (index: number, change: Partial<StoreDraft>) =>
    setDrafts((current) =>
      current.map((draft, at) => (at === index ? { ...draft, ...change } : draft)),
    );
  const move = (index: number, by: -1 | 1) =>
    setDrafts((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (item) next.splice(index + by, 0, item);
      return next;
    });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(storesSettingSchema, payload, (data) =>
      apiRequest('/admin/settings/stores', { method: 'PUT', body: data }),
    );
    if (saved) router.refresh();
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      {drafts.length === 0 ? (
        <p className="rounded-control border border-dashed border-line p-6 text-center text-body-sm text-fg-subtle">
          {t('settings.storesEmpty')}
        </p>
      ) : null}
      <ol className="space-y-5">
        {drafts.map((draft, index) => {
          const [latitude, longitude] = parseCoordinates(draft.coordinates);
          const located = Number.isFinite(latitude) && Number.isFinite(longitude);
          const coordinatesError =
            message(visible[`${index}.latitude`], draft.coordinates) ??
            message(visible[`${index}.longitude`], draft.coordinates);
          return (
            <li key={draft.id}>
              <fieldset className="rounded-panel border border-line bg-surface p-5">
                <legend className="px-1 text-title-sm text-fg">
                  {draft.name.trim() || t('settings.storeNew')}
                </legend>
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('settings.storeUp', { name: draft.name || index + 1 })}
                  >
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === drafts.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('settings.storeDown', { name: draft.name || index + 1 })}
                  >
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrafts((current) => current.filter((_, at) => at !== index))}
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                    {t('settings.storeRemove')}
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label={t('settings.storeName')}
                    name={`store-${index}-name`}
                    required
                    maxLength={120}
                    value={draft.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    error={message(visible[`${index}.name`], draft.name)}
                  />
                  <TextField
                    label={t('settings.storePhone')}
                    name={`store-${index}-phone`}
                    type="tel"
                    maxLength={30}
                    value={draft.phone}
                    onChange={(event) => update(index, { phone: event.target.value })}
                    error={message(visible[`${index}.phone`], draft.phone)}
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {LOCALES.map((locale) => (
                    <TextAreaField
                      key={locale}
                      label={`${t('settings.storeAddress')} · ${t(`common.locales.${locale}`)}`}
                      name={`store-${index}-address-${locale}`}
                      required={locale === 'uz'}
                      rows={2}
                      maxLength={300}
                      lang={locale === 'uz' ? 'uz-Latn' : locale}
                      value={draft.address[locale]}
                      onChange={(event) =>
                        update(index, {
                          address: { ...draft.address, [locale]: event.target.value },
                        })
                      }
                      error={message(visible[`${index}.address.${locale}`], draft.address[locale])}
                    />
                  ))}
                  {LOCALES.map((locale) => (
                    <TextAreaField
                      key={locale}
                      label={`${t('settings.storeHours')} · ${t(`common.locales.${locale}`)}`}
                      name={`store-${index}-hours-${locale}`}
                      rows={3}
                      maxLength={400}
                      hint={locale === 'uz' ? t('settings.storeHoursHint') : undefined}
                      lang={locale === 'uz' ? 'uz-Latn' : locale}
                      value={draft.hours[locale]}
                      onChange={(event) =>
                        update(index, { hours: { ...draft.hours, [locale]: event.target.value } })
                      }
                      error={message(visible[`${index}.hours.${locale}`], draft.hours[locale])}
                    />
                  ))}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <TextField
                      label={t('settings.storeCoordinates')}
                      name={`store-${index}-coordinates`}
                      required
                      inputMode="decimal"
                      placeholder="40.998, 71.672"
                      hint={t('settings.storeCoordinatesHint')}
                      value={draft.coordinates}
                      onChange={(event) => update(index, { coordinates: event.target.value })}
                      error={coordinatesError}
                    />
                    {located ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-brand underline-offset-4 hover:underline"
                      >
                        <MapPin aria-hidden className="h-4 w-4" />
                        {t('settings.storeCheckMap')}
                      </a>
                    ) : null}
                  </div>
                  <fieldset>
                    <legend className="mb-2 text-label text-fg">{t('settings.storeKinds')}</legend>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {STORE_KINDS.map((kind) => (
                        <CheckboxField
                          key={kind}
                          label={t(`settings.storeKind.${kind}`)}
                          name={`store-${index}-kind-${kind}`}
                          checked={draft.kinds.includes(kind)}
                          onChange={(event) =>
                            update(index, {
                              kinds: event.target.checked
                                ? STORE_KINDS.filter((k) => k === kind || draft.kinds.includes(k))
                                : draft.kinds.filter((k) => k !== kind),
                            })
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="mt-4">
                  <CheckboxField
                    label={t('settings.storeActive')}
                    name={`store-${index}-active`}
                    checked={draft.active}
                    onChange={(event) => update(index, { active: event.target.checked })}
                  />
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          setDrafts((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              name: '',
              address: emptyText(),
              hours: emptyText(),
              phone: '',
              coordinates: '',
              kinds: ['SHOP'],
              active: true,
            },
          ])
        }
      >
        <Plus aria-hidden className="h-4 w-4" />
        {t('settings.storeAdd')}
      </Button>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('common.saved')}</SuccessMessage> : null}
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('common.save')}
        sendingLabel={t('common.saving')}
        className=""
      />
    </form>
  );
}
