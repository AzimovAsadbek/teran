'use client';

import {
  checkoutSchema,
  formatUzPhone,
  isOnlinePaymentMethod,
  normalizeUzPhone,
  REGIONS,
  regionName,
  type AddressDto,
  type CheckoutInput,
  type CheckoutOptionsDto,
  type CheckoutQuoteDto,
  type CurrentUserDto,
  type Locale,
  type PaymentMethod,
  type PlacedOrderDto,
} from '@teran/contracts';
import { ArrowRight, ChevronDown, ExternalLink, PencilLine } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { EmptyCart } from '@/components/cart/cart-drawer';
import { Button } from '@/components/ui/button';
import {
  CheckboxField,
  FieldError,
  focusFirstInvalid,
  FormErrorSummary,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Price } from '@/components/ui/price';
import { Skeleton } from '@/components/ui/skeleton';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '@/lib/forms';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { siteUrl } from '@/lib/site';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ChoiceCard } from './choice-card';
import { OrderSummary } from './order-summary';
import { PaymentMethodCard } from '@/components/payments/payment-method-card';
import { ReceiptPanel } from '@/components/payments/receipt';

interface Values {
  name: string;
  phone: string;
  email: string;
  regionCode: string;
  city: string;
  addressLine: string;
  landmark: string;
  methodCode: string;
  paymentMethod: PaymentMethod | '';
  note: string;
  acceptTerms: boolean;
}

/** Where each value's validation error is reported (the API's field paths). */
const ERROR_PATHS: Record<keyof Values, string> = {
  name: 'customer.name',
  phone: 'customer.phone',
  email: 'customer.email',
  regionCode: 'delivery.regionCode',
  city: 'delivery.city',
  addressLine: 'delivery.addressLine',
  landmark: 'delivery.landmark',
  methodCode: 'delivery.methodCode',
  paymentMethod: 'paymentMethod',
  note: 'note',
  acceptTerms: 'acceptTerms',
};

type QuoteResult = { key: string; quote: CheckoutQuoteDto } | { key: string; failed: true };

/** The first delivery method that serves a region (methods without regions serve everywhere). */
function firstMethodFor(options: CheckoutOptionsDto, regionCode: string): string {
  return (
    options.deliveryMethods.find(
      (candidate) =>
        candidate.regionCodes.length === 0 || candidate.regionCodes.includes(regionCode),
    )?.code ?? ''
  );
}

function initialValues(
  user: CurrentUserDto,
  options: CheckoutOptionsDto,
  address: AddressDto | null,
): Values {
  const phone = user.phone ? normalizeUzPhone(user.phone) : null;
  return {
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    phone: phone ? formatUzPhone(phone) : '',
    email: user.email ?? '',
    regionCode: address?.regionCode ?? '',
    city: address?.city ?? '',
    addressLine: address?.addressLine ?? '',
    landmark: address?.landmark ?? '',
    methodCode: address ? firstMethodFor(options, address.regionCode) : '',
    paymentMethod: options.paymentMethods.length === 1 ? (options.paymentMethods[0] ?? '') : '',
    note: '',
    acceptTerms: false,
  };
}

/**
 * Checkout. The browser only collects and validates input: the subtotal, delivery fee and total shown
 * come from the API, the order is priced again on the server, and `expectedTotal` makes the server
 * refuse the order (PRICE_CHANGED) if anything changed since the customer saw the total. One
 * idempotency key per checkout means a retried or double-clicked submit can never create two orders.
 */
export function CheckoutForm({
  options,
  user,
  addresses,
}: {
  options: CheckoutOptionsDto;
  user: CurrentUserDto;
  /** The signed-in customer's address book. */
  addresses: AddressDto[];
}) {
  const t = useTranslations('Checkout');
  const tv = useTranslations('Validation');
  const tc = useTranslations('Common');
  const tcart = useTranslations('Cart');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const placing = useRef(false);
  const validationMessage = useValidationMessage();
  const { cart, status: cartStatus } = useCart();
  const deliveryEnabled = options.deliveryEnabled !== false;

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const [savedAddressId, setSavedAddressId] = useState(defaultAddress?.id ?? '');
  const [values, setValues] = useState<Values>(() => initialValues(user, options, defaultAddress));
  const [saveAddress, setSaveAddress] = useState(false);
  const [destination, setDestination] = useState<'payment' | 'order' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const apiErrorMessage = useApiErrorMessage(apiError);
  const [submitting, setSubmitting] = useState(false);
  const [priceChangedTotal, setPriceChangedTotal] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteNonce, setQuoteNonce] = useState(0);

  useEffect(() => {
    void cartActions.load(locale, true);
  }, [locale]);

  const methods = values.regionCode
    ? options.deliveryMethods.filter(
        (method) =>
          method.regionCodes.length === 0 || method.regionCodes.includes(values.regionCode),
      )
    : [];
  const method = methods.find((candidate) => candidate.code === values.methodCode) ?? null;

  // The quote is keyed by everything it depends on, so a stale response is never shown as current.
  const cartKey = cart ? `${cart.subtotal}|${cart.itemCount}` : '';
  const quoteKey =
    method && cartKey ? `${values.regionCode}|${method.code}|${cartKey}|${quoteNonce}` : '';
  useEffect(() => {
    if (!quoteKey || !method) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      locale,
      methodCode: method.code,
      regionCode: values.regionCode,
    });
    apiRequest<CheckoutQuoteDto>(`/checkout/quote?${query.toString()}`, {
      signal: controller.signal,
    })
      .then((quote) => setQuoteResult({ key: quoteKey, quote }))
      .catch(() => {
        if (!controller.signal.aborted) setQuoteResult({ key: quoteKey, failed: true });
      });
    return () => controller.abort();
    // `method` is derived from the values already in the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, locale]);

  const currentQuote =
    quoteResult && quoteResult.key === quoteKey && 'quote' in quoteResult
      ? quoteResult.quote
      : null;
  const quoteFailed =
    quoteResult !== null && quoteResult.key === quoteKey && 'failed' in quoteResult;
  const quoteLoading = Boolean(quoteKey) && !currentQuote && !quoteFailed;
  const reviewedTotal = deliveryEnabled ? currentQuote?.total : cart?.subtotal;

  // A corrected field drops its error straight away; the rest stay until the next submit.
  function clearError(...paths: string[]) {
    setErrors((current) => {
      if (!paths.some((path) => path in current)) return current;
      const next = { ...current };
      for (const path of paths) delete next[path];
      return next;
    });
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    clearError(ERROR_PATHS[key]);
  }

  /** Fills the delivery fields from a saved address (the customer can still edit them). */
  function chooseSavedAddress(id: string) {
    setSavedAddressId(id);
    const address = addresses.find((candidate) => candidate.id === id);
    if (!address) return;
    clearError(
      'delivery.regionCode',
      'delivery.city',
      'delivery.addressLine',
      'delivery.methodCode',
    );
    setValues((current) => ({
      ...current,
      regionCode: address.regionCode,
      city: address.city,
      addressLine: address.addressLine,
      landmark: address.landmark ?? '',
      methodCode: options.deliveryMethods.some(
        (candidate) =>
          candidate.code === current.methodCode &&
          (candidate.regionCodes.length === 0 ||
            candidate.regionCodes.includes(address.regionCode)),
      )
        ? current.methodCode
        : firstMethodFor(options, address.regionCode),
    }));
  }

  function chooseRegion(regionCode: string) {
    const available = options.deliveryMethods.filter(
      (candidate) =>
        candidate.regionCodes.length === 0 || candidate.regionCodes.includes(regionCode),
    );
    clearError('delivery.regionCode', 'delivery.methodCode');
    setValues((current) => ({
      ...current,
      regionCode,
      // Keep the chosen method when it also serves the new region; otherwise preselect the first one.
      methodCode: available.some((candidate) => candidate.code === current.methodCode)
        ? current.methodCode
        : (available[0]?.code ?? ''),
    }));
  }

  const fieldValues: Record<string, string> = {
    'customer.name': values.name,
    'customer.phone': values.phone,
    'customer.email': values.email,
    'delivery.city': values.city,
    'delivery.addressLine': values.addressLine,
    'delivery.landmark': values.landmark,
    note: values.note,
  };
  const error = (path: string) => validationMessage(errors[path], fieldValues[path]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (placing.current || !cart) return;
    setApiError(null);
    setPriceChangedTotal(null);

    const input: CheckoutInput = {
      idempotencyKey,
      locale,
      customer: { name: values.name, phone: values.phone, email: values.email },
      delivery: deliveryEnabled
        ? {
            methodCode: values.methodCode,
            regionCode: values.regionCode as NonNullable<CheckoutInput['delivery']>['regionCode'],
            city: values.city,
            addressLine: values.addressLine,
            landmark: values.landmark,
          }
        : undefined,
      paymentMethod: values.paymentMethod as PaymentMethod,
      note: values.note,
      expectedTotal: reviewedTotal,
      ...(deliveryEnabled && saveAddress ? { saveAddress: true } : {}),
      acceptTerms: values.acceptTerms as true,
    };
    const parsed = checkoutSchema.safeParse(input);
    const nextErrors: FieldErrors = parsed.success ? {} : fieldErrorsFromZod(parsed.error);
    if (
      method?.requiresAddress &&
      !values.addressLine.trim() &&
      !nextErrors['delivery.addressLine']
    ) {
      nextErrors['delivery.addressLine'] = { code: 'too_small', message: 'required', minimum: 1 };
    }
    if (!values.regionCode) {
      // The method list only appears once a region is chosen; the region error says what to do.
      delete nextErrors['delivery.methodCode'];
    } else if (deliveryEnabled && !values.methodCode && !nextErrors['delivery.methodCode']) {
      nextErrors['delivery.methodCode'] = { code: 'too_small', message: 'required', minimum: 1 };
    }
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) {
      setSummaryError(tv('fixErrors'));
      focusFirstInvalid(formRef.current);
      return;
    }
    if (!reviewedTotal) {
      // Valid input but the total is not known yet: never submit an order the customer has not seen priced.
      setSummaryError(quoteFailed ? t('quoteError') : tc('loading'));
      return;
    }
    setSummaryError(null);
    placing.current = true;
    setSubmitting(true);
    try {
      const placed = await apiRequest<PlacedOrderDto>('/checkout/orders', {
        method: 'POST',
        body: parsed.data,
      });
      setDestination(placed.payment?.redirectUrl ? 'payment' : 'order');
      cartActions.clear();
      if (placed.payment?.redirectUrl) {
        router.replace(`/checkout/confirm/${placed.order.number}`);
        return;
      }
      router.replace(`/account/orders/${placed.order.number}?placed=1`);
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError(0, null);
      placing.current = false;
      setSubmitting(false);
      if (failure.code === 'UNAUTHENTICATED') {
        router.replace('/account/login?next=/checkout');
        return;
      }
      if (failure.code === 'VALIDATION_FAILED') {
        setErrors(fieldErrorsFromApi(failure.body?.issues));
        setSummaryError(tv('fixErrors'));
        focusFirstInvalid(formRef.current);
        return;
      }
      if (failure.code === 'PRICE_CHANGED') {
        const total = failure.body?.details?.total;
        setPriceChangedTotal(typeof total === 'string' ? total : null);
        setQuoteNonce((nonce) => nonce + 1);
      }
      if (
        failure.code === 'PRICE_CHANGED' ||
        failure.code === 'INSUFFICIENT_STOCK' ||
        failure.code === 'CART_ITEM_UNAVAILABLE' ||
        failure.code === 'CART_EMPTY'
      ) {
        void cartActions.load(locale, true);
      }
      setApiError(failure);
    }
  }

  if (destination)
    return (
      <Notice role="status" className="mt-8">
        {t(destination === 'payment' ? 'openingReview' : 'thankYou')}
      </Notice>
    );
  if (!cart) {
    return cartStatus === 'error' ? (
      <Notice tone="danger" role="alert" className="mt-8">
        {t('loadError')}
      </Notice>
    ) : (
      <CheckoutSkeleton />
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8 rounded-panel border border-line bg-surface">
        <EmptyCart />
        <div className="pb-5 text-center">
          <Link
            href="/account/orders"
            className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4"
          >
            {t('myOrders')}
          </Link>
        </div>
      </div>
    );
  }

  const currency = tc('currency.UZS');
  const regionOptions = REGIONS.map((region) => ({
    value: region.code,
    label: region.name[locale],
  }));
  // Only cart problems (explained next to the button) disable it; missing input is reported on submit.
  const canSubmit = cart.isCheckoutReady && options.paymentMethods.length > 0 && !submitting;
  const submitLabel =
    values.paymentMethod && isOnlinePaymentMethod(values.paymentMethod)
      ? t('reviewOrder')
      : t('placeOrder');

  return (
    <div className="mt-6 grid min-w-0 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
      {/* Mobile: the order summary collapses above the form. */}
      <details className="group rounded-card border border-line border-l-[3px] border-l-brand bg-brand-soft/30 px-4 lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-2 text-title-sm text-fg [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            {t('summary')}
            <ChevronDown
              aria-hidden
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </span>
          {reviewedTotal ? (
            <Price amount={reviewedTotal} />
          ) : (
            <span className="text-helper text-fg-muted">{t('totalPending')}</span>
          )}
        </summary>
        <div className="mt-3">
          <OrderSummary
            cart={cart}
            quote={currentQuote}
            quoteLoading={quoteLoading}
            deliveryEnabled={deliveryEnabled}
          />
        </div>
      </details>

      <form
        method="post"
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="min-w-0 space-y-7 sm:space-y-9"
        aria-busy={submitting}
      >
        <FormErrorSummary message={summaryError} />

        <Section title={t('contactSection')}>
          <TextField
            label={t('name')}
            name="name"
            autoComplete="name"
            required
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            error={error('customer.name')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={t('phone')}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+998 90 123 45 67"
              required
              value={values.phone}
              onChange={(event) => set('phone', event.target.value)}
              onBlur={() => {
                const normalized = normalizeUzPhone(values.phone);
                if (normalized) set('phone', formatUzPhone(normalized));
              }}
              hint={t('phoneHint')}
              error={error('customer.phone')}
            />
            <TextField
              label={t('email')}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => set('email', event.target.value)}
              hint={t('emailHint')}
              error={error('customer.email')}
            />
          </div>
        </Section>

        {deliveryEnabled ? (
          <Section title={t('deliverySection')}>
            {addresses.length > 0 ? (
              <SelectField
                label={t('savedAddress')}
                name="savedAddress"
                placeholder={t('savedAddressPlaceholder')}
                options={addresses.map((address) => ({
                  value: address.id,
                  label: [
                    address.label,
                    regionName(address.regionCode, locale),
                    address.city,
                    address.addressLine,
                  ]
                    .filter(Boolean)
                    .join(', '),
                }))}
                value={savedAddressId}
                onChange={(event) => chooseSavedAddress(event.target.value)}
              />
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t('region')}
                name="region"
                autoComplete="address-level1"
                required
                placeholder={t('regionPlaceholder')}
                options={regionOptions}
                value={values.regionCode}
                onChange={(event) => chooseRegion(event.target.value)}
                error={error('delivery.regionCode')}
              />
              <TextField
                label={t('city')}
                name="city"
                autoComplete="address-level2"
                required
                value={values.city}
                onChange={(event) => set('city', event.target.value)}
                error={error('delivery.city')}
              />
            </div>
            <TextField
              label={t('address')}
              name="address"
              autoComplete="street-address"
              required={method?.requiresAddress ?? true}
              value={values.addressLine}
              onChange={(event) => set('addressLine', event.target.value)}
              hint={t('addressHint')}
              error={error('delivery.addressLine')}
            />
            <TextField
              label={t('landmark')}
              name="landmark"
              value={values.landmark}
              onChange={(event) => set('landmark', event.target.value)}
              hint={t('landmarkHint')}
              error={error('delivery.landmark')}
            />
            {user ? (
              <CheckboxField
                name="saveAddress"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
                label={t('saveAddressToBook')}
              />
            ) : null}

            <fieldset
              aria-describedby={errors['delivery.methodCode'] ? 'delivery-method-error' : undefined}
            >
              <legend className="mb-2 text-label text-fg">{t('deliveryMethod')}</legend>
              {!values.regionCode ? (
                <Notice tone="neutral" compact>
                  {t('chooseRegionFirst')}
                </Notice>
              ) : methods.length === 0 ? (
                <Notice tone="warning" compact>
                  {t('noMethodsForRegion')}
                </Notice>
              ) : (
                <div className="space-y-2.5">
                  {methods.map((candidate) => (
                    <ChoiceCard
                      key={candidate.code}
                      name="deliveryMethod"
                      value={candidate.code}
                      checked={values.methodCode === candidate.code}
                      onChange={(code) => set('methodCode', code)}
                      invalid={Boolean(errors['delivery.methodCode'])}
                      title={candidate.name}
                      aside={
                        Number(candidate.price) === 0
                          ? t('free')
                          : formatMoney(candidate.price, locale, currency)
                      }
                      description={
                        <>
                          {[candidate.estimate, candidate.description].filter(Boolean).join(' · ')}
                          {candidate.freeFromAmount ? (
                            <span className="block text-success">
                              {t('freeFrom', {
                                amount: formatMoney(candidate.freeFromAmount, locale, currency),
                              })}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  ))}
                </div>
              )}
              {errors['delivery.methodCode'] ? (
                <FieldError id="delivery-method-error">{error('delivery.methodCode')}</FieldError>
              ) : null}
              {quoteFailed ? (
                <Notice tone="danger" role="alert" compact className="mt-3">
                  {t('quoteError')}{' '}
                  <button
                    type="button"
                    onClick={() => setQuoteNonce((nonce) => nonce + 1)}
                    className="font-semibold underline underline-offset-2"
                  >
                    {tc('retry')}
                  </button>
                </Notice>
              ) : null}
            </fieldset>
          </Section>
        ) : null}
        <Section title={t('paymentSection')}>
          <fieldset
            role="radiogroup"
            aria-labelledby="payment-method-label"
            aria-invalid={Boolean(errors.paymentMethod) || undefined}
            tabIndex={-1}
            aria-describedby={errors.paymentMethod ? 'payment-method-error' : undefined}
          >
            <legend id="payment-method-label" className="sr-only">
              {t('paymentSection')}
            </legend>
            <div className="space-y-2.5">
              {options.paymentOptions.map((option) => (
                <PaymentMethodCard
                  key={option.method}
                  option={option}
                  name="paymentMethod"
                  checked={values.paymentMethod === option.method}
                  onChange={() => set('paymentMethod', option.method)}
                  invalid={Boolean(errors.paymentMethod)}
                />
              ))}
            </div>
            {options.paymentMethods.length === 0 && (
              <Notice className="mt-4" role="status">
                <p>{t('paymentOffline')}</p>
                {['localhost', '127.0.0.1'].includes(new URL(siteUrl).hostname) && (
                  <a
                    className="mt-2 inline-flex font-semibold text-brand underline"
                    href={
                      'https://terantrade.uz' + (locale === 'uz' ? '' : '/' + locale) + '/catalog'
                    }
                  >
                    {t('liveShop')}
                  </a>
                )}
              </Notice>
            )}
            {errors.paymentMethod ? (
              <FieldError id="payment-method-error">{error('paymentMethod')}</FieldError>
            ) : null}
            {values.paymentMethod && isOnlinePaymentMethod(values.paymentMethod) ? (
              <p className="mt-3 text-body-sm text-fg-muted">
                {t('paymentRedirectNote', { minutes: options.onlinePaymentWindowMinutes })}
              </p>
            ) : null}
          </fieldset>
        </Section>

        <details className="group border-b border-line pb-3" open={errors.note ? true : undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-body-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
            <PencilLine aria-hidden className="size-4" />
            {t('addNote')}
            <ChevronDown
              aria-hidden
              className="ml-auto size-4 motion-safe:transition-transform group-open:rotate-180"
            />
          </summary>
          <TextAreaField
            label={t('note')}
            name="note"
            maxLength={500}
            placeholder={t('notePlaceholder')}
            value={values.note}
            onChange={(event) => set('note', event.target.value)}
            error={error('note')}
          />
        </details>

        <div className="space-y-4 pb-2">
          <CheckboxField
            name="acceptTerms"
            checked={values.acceptTerms}
            onChange={(event) => set('acceptTerms', event.target.checked)}
            error={error('acceptTerms')}
            label={t.rich('acceptTerms', {
              terms: (chunks) => <PolicyLink href="/terms">{chunks}</PolicyLink>,
              privacy: (chunks) => <PolicyLink href="/privacy">{chunks}</PolicyLink>,
            })}
          />

          {priceChangedTotal ? (
            <Notice tone="warning" role="alert">
              {t('priceChanged', { total: formatMoney(priceChangedTotal, locale, currency) })}
            </Notice>
          ) : apiErrorMessage ? (
            <Notice tone="danger" role="alert">
              {apiErrorMessage}{' '}
              {apiError && (apiError.status === 0 || apiError.status >= 500) && (
                <Link
                  href="/account/orders"
                  className="font-semibold text-brand underline underline-offset-4"
                >
                  {t('myOrders')}
                </Link>
              )}
              {apiError?.code === 'FISCAL_DATA_MISSING' ? (
                <Link href="/contact" className="font-semibold underline underline-offset-2">
                  {t('contact')}
                </Link>
              ) : null}
              {apiError?.code && apiError.code.startsWith('CART') ? (
                <Link href="/cart" className="font-semibold underline underline-offset-2">
                  {t('editCart')}
                </Link>
              ) : null}
            </Notice>
          ) : null}
          {!cart.isCheckoutReady ? (
            <Notice tone="danger">
              {tcart('notReady')}{' '}
              <Link href="/cart" className="font-semibold underline underline-offset-2">
                {t('editCart')}
              </Link>
            </Notice>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            loading={submitting}
            className="h-auto min-h-13 w-full gap-2 px-4 py-3 whitespace-normal"
          >
            {submitting
              ? t('placing')
              : reviewedTotal
                ? `${submitLabel} · ${formatMoney(reviewedTotal, locale, currency)}`
                : submitLabel}
            {!submitting && <ArrowRight aria-hidden className="size-4 shrink-0" />}
          </Button>
        </div>
      </form>

      <aside className="hidden min-w-0 lg:sticky lg:top-6 lg:block">
        <ReceiptPanel title={t('summary')}>
          <OrderSummary
            cart={cart}
            quote={currentQuote}
            quoteLoading={quoteLoading}
            deliveryEnabled={deliveryEnabled}
          />
        </ReceiptPanel>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 sm:pt-6">
      <h2 className="font-heading text-[1.45rem] leading-tight text-fg sm:text-[1.65rem]">
        {title}
      </h2>
      <div className="mt-4 space-y-4 sm:mt-5">{children}</div>
    </section>
  );
}

/** Policies open in a new tab so the half-filled form is not lost. */
function PolicyLink({ href, children }: { href: '/terms' | '/privacy'; children: ReactNode }) {
  const tc = useTranslations('Common');
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-baseline gap-0.5 font-semibold text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
    >
      {children}
      <ExternalLink aria-hidden className="h-3 w-3 self-center" />
      <span className="sr-only"> ({tc('opensInNewTab')})</span>
    </Link>
  );
}

function CheckoutSkeleton() {
  return (
    <div
      className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-14"
      aria-hidden
    >
      <div className="space-y-5">
        <Skeleton className="h-72 rounded-panel" />
        <Skeleton className="h-96 rounded-panel" />
      </div>
      <Skeleton className="hidden h-80 rounded-panel lg:block" />
    </div>
  );
}
