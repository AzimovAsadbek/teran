'use client';

import {
  addressInputSchema,
  formatUzPhone,
  MAX_ADDRESSES,
  REGIONS,
  regionName,
  type AddressDto,
  type Locale,
} from '@teran/contracts';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ApiAlert, SubmitButton } from './auth-forms';

type Editing = { mode: 'new' } | { mode: 'edit'; address: AddressDto } | null;

/**
 * The customer's address book. Every change goes to the API, which only ever touches the signed-in
 * customer's own addresses; the list shown is always the one the API returned.
 */
export function AddressBook({ initial }: { initial: AddressDto[] }) {
  const t = useTranslations('Account');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AddressDto | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);
  const full = addresses.length >= MAX_ADDRESSES;

  async function run(key: string, request: () => Promise<AddressDto[]>) {
    setPending(key);
    setError(null);
    try {
      setAddresses(await request());
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
      return false;
    } finally {
      setPending(null);
    }
  }

  const describe = (address: AddressDto) =>
    [regionName(address.regionCode, locale), address.city, address.addressLine]
      .filter(Boolean)
      .join(', ');

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <Notice tone="danger" role="alert">
          {errorMessage}
        </Notice>
      ) : null}
      {addresses.length === 0 ? (
        <p className="rounded-panel border border-line bg-surface p-7 text-body text-fg-muted">
          {t('addressesEmpty')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-fg" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-title-sm text-fg">
                    {address.label ?? address.recipientName}
                    {address.isDefault ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-caption font-semibold text-fg">
                        {t('defaultAddress')}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-body-sm text-fg">{describe(address)}</p>
                  {address.landmark ? (
                    <p className="text-body-sm text-fg-subtle">{address.landmark}</p>
                  ) : null}
                  <p className="mt-1 text-body-sm text-fg-muted">
                    {address.recipientName} · {formatUzPhone(address.phone)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line-subtle pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing({ mode: 'edit', address })}
                >
                  <Pencil aria-hidden className="h-4 w-4" />
                  {t('editAddress')}
                </Button>
                {!address.isDefault ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={pending === `default-${address.id}`}
                    onClick={() =>
                      void run(`default-${address.id}`, () =>
                        apiRequest<AddressDto[]>(`/account/addresses/${address.id}/default`, {
                          method: 'POST',
                        }),
                      )
                    }
                  >
                    <Star aria-hidden className="h-4 w-4" />
                    {t('makeDefault')}
                  </Button>
                ) : null}
                <Button variant="danger-ghost" size="sm" onClick={() => setDeleting(address)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                  {t('deleteAddress')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button onClick={() => setEditing({ mode: 'new' })} disabled={full}>
          <Plus aria-hidden className="h-4 w-4" />
          {t('addAddress')}
        </Button>
        {full ? (
          <p className="mt-2 text-body-sm text-fg-subtle">
            {t('addressLimit', { max: MAX_ADDRESSES })}
          </p>
        ) : null}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? t('editAddress') : t('addAddress')}
        closeLabel={tc('close')}
      >
        {editing ? (
          <AddressForm
            address={editing.mode === 'edit' ? editing.address : null}
            first={addresses.length === 0}
            onSaved={(saved) => {
              setAddresses((current) => {
                const others = current.filter((entry) => entry.id !== saved.id);
                const next = saved.isDefault
                  ? others.map((entry) => ({ ...entry, isDefault: false }))
                  : others;
                return [saved, ...next].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
              });
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('deleteAddress')}
        description={
          deleting
            ? t('confirmDeleteAddress', { name: deleting.label ?? describe(deleting) })
            : undefined
        }
        closeLabel={tc('close')}
        dismissible={pending === null}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={pending !== null}
            >
              {tc('cancel')}
            </Button>
            <Button
              variant="danger"
              loading={pending === 'delete'}
              onClick={() => {
                const target = deleting;
                if (!target) return;
                void run('delete', () =>
                  apiRequest<AddressDto[]>(`/account/addresses/${target.id}`, {
                    method: 'DELETE',
                  }),
                ).then((done) => done && setDeleting(null));
              }}
            >
              {t('deleteAddress')}
            </Button>
          </>
        }
      />
    </div>
  );
}

function AddressForm({
  address,
  first,
  onSaved,
}: {
  address: AddressDto | null;
  first: boolean;
  onSaved: (address: AddressDto) => void;
}) {
  const t = useTranslations('Account');
  const tk = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({
    label: address?.label ?? '',
    recipientName: address?.recipientName ?? '',
    phone: address ? formatUzPhone(address.phone) : '',
    regionCode: address?.regionCode ?? '',
    city: address?.city ?? '',
    addressLine: address?.addressLine ?? '',
    landmark: address?.landmark ?? '',
    isDefault: address?.isDefault ?? first,
  });
  const set =
    (key: Exclude<keyof typeof values, 'isDefault'>) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  const error = (key: keyof typeof values) =>
    message(form.errors[key], key === 'isDefault' ? undefined : values[key]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result: { saved?: AddressDto } = {};
    const ok = await form.submit(addressInputSchema, values, async (data) => {
      result.saved = await apiRequest<AddressDto>(
        address ? `/account/addresses/${address.id}` : '/account/addresses',
        { method: address ? 'PUT' : 'POST', body: data },
      );
    });
    if (ok && result.saved) onSaved(result.saved);
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('addressLabel')}
        name="label"
        hint={t('addressLabelHint')}
        value={values.label}
        onChange={set('label')}
        error={error('label')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('recipient')}
          name="recipientName"
          autoComplete="name"
          required
          value={values.recipientName}
          onChange={set('recipientName')}
          error={error('recipientName')}
        />
        <TextField
          label={tk('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          required
          value={values.phone}
          onChange={set('phone')}
          error={error('phone')}
        />
        <SelectField
          label={tk('region')}
          name="regionCode"
          autoComplete="address-level1"
          required
          placeholder={tk('regionPlaceholder')}
          options={REGIONS.map((region) => ({ value: region.code, label: region.name[locale] }))}
          value={values.regionCode}
          onChange={set('regionCode')}
          error={error('regionCode')}
        />
        <TextField
          label={tk('city')}
          name="city"
          autoComplete="address-level2"
          required
          value={values.city}
          onChange={set('city')}
          error={error('city')}
        />
      </div>
      <TextField
        label={tk('address')}
        name="addressLine"
        autoComplete="street-address"
        required
        hint={tk('addressHint')}
        value={values.addressLine}
        onChange={set('addressLine')}
        error={error('addressLine')}
      />
      <TextField
        label={tk('landmark')}
        name="landmark"
        hint={tk('landmarkHint')}
        value={values.landmark}
        onChange={set('landmark')}
        error={error('landmark')}
      />
      <CheckboxField
        name="isDefault"
        checked={values.isDefault}
        onChange={(event) =>
          setValues((current) => ({ ...current, isDefault: event.target.checked }))
        }
        label={t('makeDefault')}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton sending={form.status === 'sending'} label={t('saveAddress')} />
    </form>
  );
}
