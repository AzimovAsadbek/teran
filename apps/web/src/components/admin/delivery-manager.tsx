'use client';

import {
  REGIONS,
  deliveryMethodUpsertSchema,
  type AdminDeliveryMethod,
  type Locale,
} from '@teran/contracts';
import { Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';
import { table } from './ui';

const KEYS = ['name', 'description', 'estimate'] as const;
const money = (value: string) => value.replace(/[\s ]/g, '').replace(',', '.');

function MethodForm({
  method,
  onDone,
}: {
  method: AdminDeliveryMethod | null;
  onDone: () => void;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [code, setCode] = useState(method?.code ?? '');
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [position, setPosition] = useState(String(method?.position ?? 0));
  const [price, setPrice] = useState(method?.price.replace(/\.00$/, '') ?? '');
  const [freeFrom, setFreeFrom] = useState(method?.freeFromAmount?.replace(/\.00$/, '') ?? '');
  const [regions, setRegions] = useState<string[]>(method?.regionCodes ?? []);
  const [requiresAddress, setRequiresAddress] = useState(method?.requiresAddress ?? true);
  const [translations, setTranslations] = useState(() =>
    fromTranslation(method?.translations ?? null, KEYS),
  );
  const error = (path: string, value?: string) => message(form.errors[path], value);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      code: code.trim(),
      isActive,
      position: Number(position) || 0,
      price: money(price),
      freeFromAmount: freeFrom.trim() ? money(freeFrom) : null,
      regionCodes: regions,
      requiresAddress,
      translations: toTranslationPayload(translations),
    };
    const saved = await form.submit(deliveryMethodUpsertSchema, payload, (data) =>
      method
        ? apiRequest(`/admin/delivery-methods/${method.id}`, { method: 'PUT', body: data })
        : apiRequest('/admin/delivery-methods', { method: 'POST', body: data }),
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
        label={t('delivery.code')}
        name="code"
        required
        hint={t('delivery.codeHint')}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={error('code', code)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('delivery.price')}
          name="price"
          required
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          error={error('price', price)}
        />
        <TextField
          label={t('delivery.freeFrom')}
          name="freeFrom"
          inputMode="decimal"
          hint={t('delivery.freeFromHint')}
          value={freeFrom}
          onChange={(event) => setFreeFrom(event.target.value)}
          error={error('freeFromAmount', freeFrom)}
        />
        <TextField
          label={t('common.position')}
          name="position"
          required
          inputMode="numeric"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          error={error('position', position)}
        />
      </div>
      <CheckboxField
        label={t('common.active')}
        name="isActive"
        checked={isActive}
        onChange={(event) => setIsActive(event.target.checked)}
      />
      <CheckboxField
        label={t('delivery.requiresAddress')}
        name="requiresAddress"
        checked={requiresAddress}
        onChange={(event) => setRequiresAddress(event.target.checked)}
      />
      <fieldset>
        <legend className="text-sm font-semibold text-forest-900">{t('delivery.regions')}</legend>
        <p className="mb-2 text-sm text-ink-500">{t('delivery.regionsHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {REGIONS.map((region) => (
            <CheckboxField
              key={region.code}
              label={region.name[locale]}
              name={`region-${region.code}`}
              checked={regions.includes(region.code)}
              onChange={(event) =>
                setRegions((current) =>
                  event.target.checked
                    ? [...current, region.code]
                    : current.filter((code) => code !== region.code),
                )
              }
            />
          ))}
        </div>
      </fieldset>
      <TranslationEditor
        value={translations}
        onChange={setTranslations}
        error={error}
        fields={[
          { key: 'name', label: t('delivery.name'), required: true, maxLength: 100 },
          {
            key: 'estimate',
            label: t('delivery.estimate'),
            maxLength: 100,
            hint: t('delivery.estimateHint'),
          },
          {
            key: 'description',
            label: t('delivery.description'),
            multiline: true,
            rows: 2,
            maxLength: 300,
          },
        ]}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={method ? t('common.save') : t('common.create')}
        sendingLabel={t('common.saving')}
      />
    </form>
  );
}

/** Delivery methods and their prices; editing is limited to administrators (enforced by the API too). */
export function DeliveryManager({
  methods,
  canEdit,
}: {
  methods: AdminDeliveryMethod[];
  canEdit: boolean;
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const [editing, setEditing] = useState<AdminDeliveryMethod | 'new' | null>(null);
  const name = (method: AdminDeliveryMethod) =>
    method.translations[locale]?.name ?? method.translations.uz.name;
  const currency = tc('currency.UZS');

  return (
    <>
      {canEdit ? (
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-900 px-5 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t('delivery.newMethod')}
          </button>
        </div>
      ) : null}
      <div className={table.wrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col" className={table.th}>
                {t('delivery.name')}
              </th>
              <th scope="col" className={table.th}>
                {t('delivery.price')}
              </th>
              <th scope="col" className={table.th}>
                {t('delivery.freeFrom')}
              </th>
              <th scope="col" className={table.th}>
                {t('delivery.regions')}
              </th>
              <th scope="col" className={table.th}>
                {t('common.status')}
              </th>
              {canEdit ? (
                <th scope="col" className={`${table.th} text-right`}>
                  {t('common.actions')}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.id} className="hover:bg-ivory-50">
                <td className={table.td}>
                  <span className="font-semibold">{name(method)}</span>
                  <span className="block font-mono text-xs text-ink-500">{method.code}</span>
                </td>
                <td className={`${table.td} whitespace-nowrap tabular-nums`}>
                  {formatMoney(method.price, locale, currency)}
                </td>
                <td className={`${table.td} whitespace-nowrap tabular-nums`}>
                  {method.freeFromAmount
                    ? formatMoney(method.freeFromAmount, locale, currency)
                    : '—'}
                </td>
                <td className={table.td}>
                  {method.regionCodes.length === 0
                    ? t('delivery.allRegions')
                    : method.regionCodes.length}
                </td>
                <td className={table.td}>
                  {method.isActive ? t('common.active') : t('common.inactive')}
                </td>
                {canEdit ? (
                  <td className={`${table.td} text-right`}>
                    <button
                      type="button"
                      onClick={() => setEditing(method)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ivory-100"
                      aria-label={`${t('common.edit')}: ${name(method)}`}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        side="right"
        title={editing === 'new' ? t('delivery.newMethod') : editing ? name(editing) : ''}
        closeLabel={tc('close')}
      >
        {editing !== null ? (
          <MethodForm
            key={editing === 'new' ? 'new' : editing.id}
            method={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </>
  );
}
