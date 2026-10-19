'use client';

import {
  LOCALES,
  STORE_KINDS,
  storesSettingSchema,
  type Locale,
  type StoreKind,
  type StoresSetting,
} from '@teran/contracts';
import { ArrowDown, ArrowUp, ChevronDown, MapPin, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiAlert, SubmitButton, SuccessMessage } from '@/components/account/auth-forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormErrorSummary, TextAreaField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { useValidationMessage } from '@/lib/use-validation-message';
import { LocationPicker } from './location-picker';

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
export function parseCoordinates(text: string): [number, number] {
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

/** A titled part of a store's card. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-label font-semibold tracking-wide text-fg-subtle uppercase">{title}</h4>
      {children}
    </section>
  );
}

/**
 * The store locator's points of sale (Admin → Store addresses): one card per store, folded to its
 * name, address and state, opened to edit its name and phone, its address and opening hours in
 * the three languages, its place on the map (clicked on the map, found by its address or typed
 * as "latitude, longitude"), its kinds and whether it is shown. Stores can be added, removed and
 * reordered (the storefront lists them in this order); one save sends them all. A new store
 * starts with the shop's contact phone and hours (`defaults`), which can be changed.
 */
export function StoresForm({
  value,
  defaults,
}: {
  value: StoresSetting;
  defaults: { phone: string; hours: LocalizedText };
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [drafts, setDrafts] = useState<StoreDraft[]>(() => value.map(toDraft));
  // Open cards: all of a short list, none of a long one (a new store opens itself).
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(value.length <= 2 ? value.map((store) => store.id) : []),
  );

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
  const toggle = (id: string, show: boolean) =>
    setOpen((current) => {
      const next = new Set(current);
      if (show) next.add(id);
      else next.delete(id);
      return next;
    });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A card with a mistake opens, so the mistake can be seen.
    const result = storesSettingSchema.safeParse(payload);
    if (!result.success) {
      const failing = new Set(result.error.issues.map((issue) => Number(issue.path[0])));
      setOpen(
        (current) =>
          new Set([...current, ...drafts.filter((_, at) => failing.has(at)).map((d) => d.id)]),
      );
    }
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
      <ol className="space-y-4">
        {drafts.map((draft, index) => {
          const [latitude, longitude] = parseCoordinates(draft.coordinates);
          const located = Number.isFinite(latitude) && Number.isFinite(longitude);
          const coordinatesError =
            message(visible[`${index}.latitude`], draft.coordinates) ??
            message(visible[`${index}.longitude`], draft.coordinates);
          const expanded = open.has(draft.id);
          const bodyId = `store-${draft.id}-body`;
          const title = draft.name.trim() || t('settings.storeNew');
          return (
            <li key={draft.id}>
              <div
                className={cn(
                  'rounded-panel border bg-surface',
                  expanded ? 'border-line-strong' : 'border-line',
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-label font-semibold text-fg-inverse"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-title-sm text-fg">{title}</h3>
                    <p className="truncate text-body-sm text-fg-subtle">
                      {draft.address.uz.trim() || t('stores.noAddress')}
                    </p>
                  </div>
                  <Badge tone={draft.active ? 'leaf' : 'muted'}>
                    {draft.active ? t('stores.shown') : t('stores.hidden')}
                  </Badge>
                  <div className="flex items-center gap-1">
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
                      onClick={() =>
                        setDrafts((current) => current.filter((_, at) => at !== index))
                      }
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      {t('settings.storeRemove')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-expanded={expanded}
                      aria-controls={bodyId}
                      onClick={() => toggle(draft.id, !expanded)}
                    >
                      {expanded ? t('stores.fold') : t('stores.edit')}
                      <ChevronDown
                        aria-hidden
                        className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                      />
                    </Button>
                  </div>
                </div>

                <div id={bodyId} hidden={!expanded} className="space-y-7 border-t border-line p-5">
                  <Section title={t('stores.sectionMain')}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label={t('settings.storeName')}
                        name={`store-${index}-name`}
                        required
                        maxLength={120}
                        hint={t('stores.nameHint')}
                        value={draft.name}
                        onChange={(event) => update(index, { name: event.target.value })}
                        error={message(visible[`${index}.name`], draft.name)}
                      />
                      <TextField
                        label={t('settings.storePhone')}
                        name={`store-${index}-phone`}
                        type="tel"
                        maxLength={30}
                        placeholder="+998 97 570 70 07"
                        value={draft.phone}
                        onChange={(event) => update(index, { phone: event.target.value })}
                        error={message(visible[`${index}.phone`], draft.phone)}
                      />
                    </div>
                  </Section>

                  <Section title={t('settings.storeAddress')}>
                    <div className="grid gap-4 md:grid-cols-3">
                      {LOCALES.map((locale) => (
                        <TextAreaField
                          key={locale}
                          label={`${t('settings.storeAddress')} · ${t(`common.locales.${locale}`)}`}
                          name={`store-${index}-address-${locale}`}
                          required={locale === 'uz'}
                          rows={3}
                          maxLength={300}
                          hint={locale === 'uz' ? t('stores.addressHint') : undefined}
                          lang={locale === 'uz' ? 'uz-Latn' : locale}
                          value={draft.address[locale]}
                          onChange={(event) =>
                            update(index, {
                              address: { ...draft.address, [locale]: event.target.value },
                            })
                          }
                          error={message(
                            visible[`${index}.address.${locale}`],
                            draft.address[locale],
                          )}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title={t('settings.storeHours')}>
                    <div className="grid gap-4 md:grid-cols-3">
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
                            update(index, {
                              hours: { ...draft.hours, [locale]: event.target.value },
                            })
                          }
                          error={message(visible[`${index}.hours.${locale}`], draft.hours[locale])}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title={t('settings.storeCoordinates')}>
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                      {expanded ? (
                        <LocationPicker
                          name={title}
                          latitude={latitude}
                          longitude={longitude}
                          address={draft.address.uz}
                          onChange={(lat, lng) => update(index, { coordinates: `${lat}, ${lng}` })}
                        />
                      ) : (
                        <div />
                      )}
                      <div>
                        <TextField
                          label={t('settings.storeCoordinates')}
                          name={`store-${index}-coordinates`}
                          required
                          inputMode="decimal"
                          placeholder="40.990448, 71.641952"
                          hint={t('settings.storeCoordinatesHint')}
                          value={draft.coordinates}
                          onChange={(event) => update(index, { coordinates: event.target.value })}
                          error={coordinatesError}
                        />
                        {located ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-brand underline-offset-4 hover:underline"
                          >
                            <MapPin aria-hidden className="h-4 w-4" />
                            {t('settings.storeCheckMap')}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </Section>

                  <Section title={t('stores.sectionShow')}>
                    <fieldset>
                      <legend className="mb-2 text-label text-fg">
                        {t('settings.storeKinds')}
                      </legend>
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
                    <CheckboxField
                      label={t('settings.storeActive')}
                      name={`store-${index}-active`}
                      checked={draft.active}
                      onChange={(event) => update(index, { active: event.target.checked })}
                    />
                  </Section>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('common.saved')}</SuccessMessage> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            const id = crypto.randomUUID();
            setDrafts((current) => [
              ...current,
              {
                id,
                name: '',
                address: emptyText(),
                hours: defaults.hours,
                phone: defaults.phone,
                coordinates: '',
                kinds: ['SHOP'],
                active: true,
              },
            ]);
            toggle(id, true);
          }}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t('settings.storeAdd')}
        </Button>
        <SubmitButton
          sending={form.status === 'sending'}
          label={t('common.save')}
          sendingLabel={t('common.saving')}
          className=""
        />
      </div>
    </form>
  );
}
