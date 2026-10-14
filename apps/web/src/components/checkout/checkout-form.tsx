'use client';

import {
  checkoutSchema,
  formatUzPhone,
  normalizeUzPhone,
  REGIONS,
  type CheckoutInput,
  type CheckoutOptionsDto,
  type CheckoutQuoteDto,
  type CurrentUserDto,
  type Locale,
  type PaymentMethod,
  type PlacedOrderDto,
} from '@teran/contracts';
import { ChevronDown, ExternalLink, Lock } from 'lucide-react';
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
import { useValidationMessage } from '@/lib/use-validation-message';
import { ChoiceCard } from './choice-card';
import { OrderSummary } from './order-summary';

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

function initialValues(user: CurrentUserDto | null, options: CheckoutOptionsDto): Values {
  const phone = user?.phone ? normalizeUzPhone(user.phone) : null;
  return {
    name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '',
    phone: phone ? formatUzPhone(phone) : '',
    email: user?.email ?? '',
    regionCode: '',
    city: '',
    addressLine: '',
    landmark: '',
    methodCode: '',
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
}: {
  options: CheckoutOptionsDto;
  user: CurrentUserDto | null;
}) {
  const t = useTranslations('Checkout');
  const tv = useTranslations('Validation');
  const tc = useTranslations('Common');
  const tcart = useTranslations('Cart');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const validationMessage = useValidationMessage();
  const { cart, status: cartStatus } = useCart();

  const [values, setValues] = useState<Values>(() => initialValues(user, options));
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
    if (submitting || !cart) return;
    setApiError(null);
    setPriceChangedTotal(null);

    const input: CheckoutInput = {
      idempotencyKey,
      locale,
      customer: { name: values.name, phone: values.phone, email: values.email },
      delivery: {
        methodCode: values.methodCode,
        regionCode: values.regionCode as CheckoutInput['delivery']['regionCode'],
        city: values.city,
        addressLine: values.addressLine,
        landmark: values.landmark,
      },
      paymentMethod: values.paymentMethod as PaymentMethod,
      note: values.note,
      expectedTotal: currentQuote?.total,
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
    } else if (!values.methodCode && !nextErrors['delivery.methodCode']) {
      nextErrors['delivery.methodCode'] = { code: 'too_small', message: 'required', minimum: 1 };
    }
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) {
      setSummaryError(tv('fixErrors'));
      focusFirstInvalid(formRef.current);
      return;
    }
    if (!currentQuote) {
      // Valid input but the total is not known yet: never submit an order the customer has not seen priced.
      setSummaryError(quoteFailed ? t('quoteError') : tc('loading'));
      return;
    }
    setSummaryError(null);
    setSubmitting(true);
    try {
      const placed = await apiRequest<PlacedOrderDto>('/checkout/orders', {
        method: 'POST',
        body: parsed.data,
      });
      cartActions.clear();
      const query = new URLSearchParams({ token: placed.accessToken, placed: '1' });
      router.replace(`/orders/${placed.order.number}?${query.toString()}`);
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError(0, null);
      setSubmitting(false);
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
      </div>
    );
  }

  const currency = tc('currency.UZS');
  const regionOptions = REGIONS.map((region) => ({
    value: region.code,
    label: region.name[locale],
  }));
  // Only cart problems (explained next to the button) disable it; missing input is reported on submit.
  const canSubmit = cart.isCheckoutReady && !submitting;

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-14">
      {/* Mobile: the order summary collapses above the form. */}
      <details className="group rounded-card border border-line bg-surface px-5 py-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-sm text-fg [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            {t('summary')}
            <ChevronDown
              aria-hidden
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </span>
          {currentQuote ? <Price amount={currentQuote.total} /> : <Price amount={cart.subtotal} />}
        </summary>
        <div className="mt-3">
          <OrderSummary cart={cart} quote={currentQuote} quoteLoading={quoteLoading} />
        </div>
      </details>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="space-y-5"
        aria-busy={submitting}
      >
        <FormErrorSummary message={summaryError} />

        <Section step={1} title={t('contactSection')}>
          {!user ? (
            <p className="text-body-sm text-fg-muted">
              {t.rich('accountHint', {
                login: (chunks) => (
                  <Link
                    href="/account/login?next=/checkout"
                    className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : null}
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

        <Section step={2} title={t('deliverySection')}>
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

        <Section step={3} title={t('paymentSection')}>
          <fieldset aria-describedby={errors.paymentMethod ? 'payment-method-error' : undefined}>
            <legend className="sr-only">{t('paymentSection')}</legend>
            <div className="space-y-2.5">
              {options.paymentMethods.map((payment) => (
                <ChoiceCard
                  key={payment}
                  name="paymentMethod"
                  value={payment}
                  checked={values.paymentMethod === payment}
                  onChange={(value) => set('paymentMethod', value as PaymentMethod)}
                  invalid={Boolean(errors.paymentMethod)}
                  title={t(`paymentMethods.${payment}`)}
                  description={t(`paymentDescriptions.${payment}`)}
                />
              ))}
            </div>
            {errors.paymentMethod ? (
              <FieldError id="payment-method-error">{error('paymentMethod')}</FieldError>
            ) : null}
          </fieldset>
        </Section>

        <Section step={4} title={t('noteSection')}>
          <TextAreaField
            label={t('note')}
            name="note"
            maxLength={500}
            placeholder={t('notePlaceholder')}
            value={values.note}
            onChange={(event) => set('note', event.target.value)}
            error={error('note')}
          />
        </Section>

        <div className="space-y-4 rounded-panel border border-line bg-surface p-5 sm:p-7">
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
            className="w-full"
          >
            {submitting ? null : <Lock aria-hidden className="h-4 w-4" />}
            {submitting
              ? t('placing')
              : currentQuote
                ? `${t('placeOrder')} · ${formatMoney(currentQuote.total, locale, currency)}`
                : t('placeOrder')}
          </Button>
        </div>
      </form>

      <aside
        aria-labelledby="checkout-summary"
        className="hidden rounded-panel border border-line bg-surface p-6 shadow-soft lg:sticky lg:top-6 lg:block"
      >
        <h2 id="checkout-summary" className="text-display-sm text-forest-900">
          {t('summary')}
        </h2>
        <div className="mt-4">
          <OrderSummary cart={cart} quote={currentQuote} quoteLoading={quoteLoading} />
        </div>
      </aside>
    </div>
  );
}

/** A numbered step of the form; the number is decoration, the heading names the section. */
function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5 sm:p-7">
      <h2 className="flex items-center gap-3 text-display-sm text-forest-900">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-sans text-helper font-semibold text-fg-inverse"
        >
          {step}
        </span>
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
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
