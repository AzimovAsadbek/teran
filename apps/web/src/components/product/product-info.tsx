import type { CheckoutOptionsDto, ProductDetailDto } from '@teran/contracts';
import { ChevronDown, CreditCard, Scale, Thermometer, Timer, Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';

function Disclosure({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group border-b border-ivory-200 py-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden
          className="h-5 w-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pb-5 text-ink-700">{children}</div>
    </details>
  );
}

/** Paragraphs from plain text (never rendered as HTML). */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function minutes(seconds: number): string {
  return Number.isInteger(seconds / 60) ? String(seconds / 60) : (seconds / 60).toFixed(1);
}

/** Description, ingredients, brewing and details — only sections the product data supports. */
export async function ProductInfo({ product }: { product: ProductDetailDto }) {
  const t = await getTranslations('Product');
  const tb = await getTranslations('Brewing');
  const tc = await getTranslations('Catalog');
  const brewing = product.brewing;

  return (
    <div className="mt-10 border-t border-ivory-200">
      {product.description ? (
        <Disclosure title={t('description')} open>
          <Paragraphs text={product.description} />
        </Disclosure>
      ) : null}

      {brewing ? (
        <Disclosure title={t('brewing')} open>
          <dl className="grid gap-3 sm:grid-cols-3">
            {brewing.temperatureCelsius !== null ? (
              <div className="rounded-2xl bg-ivory-100 p-4">
                <dt className="flex items-center gap-2 text-sm text-ink-700">
                  <Thermometer aria-hidden className="h-4 w-4 text-gold-700" />
                  {tb('temperature')}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-forest-900">
                  {tb('celsius', { value: brewing.temperatureCelsius })}
                </dd>
              </div>
            ) : null}
            {brewing.timeMinSeconds !== null ? (
              <div className="rounded-2xl bg-ivory-100 p-4">
                <dt className="flex items-center gap-2 text-sm text-ink-700">
                  <Timer aria-hidden className="h-4 w-4 text-gold-700" />
                  {tb('time')}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-forest-900">
                  {brewing.timeMaxSeconds !== null &&
                  brewing.timeMaxSeconds !== brewing.timeMinSeconds
                    ? tb('minutes', {
                        min: minutes(brewing.timeMinSeconds),
                        max: minutes(brewing.timeMaxSeconds),
                      })
                    : tb('minutesSingle', { min: minutes(brewing.timeMinSeconds) })}
                </dd>
              </div>
            ) : null}
            {brewing.amountGrams !== null ? (
              <div className="rounded-2xl bg-ivory-100 p-4">
                <dt className="flex items-center gap-2 text-sm text-ink-700">
                  <Scale aria-hidden className="h-4 w-4 text-gold-700" />
                  {tb('amount')}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-forest-900">
                  {tb('gramsPerCup', { grams: Number(brewing.amountGrams) })}
                </dd>
              </div>
            ) : null}
          </dl>
        </Disclosure>
      ) : null}

      {product.ingredients ? (
        <Disclosure title={t('ingredients')}>
          <Paragraphs text={product.ingredients} />
        </Disclosure>
      ) : null}

      {product.tastingNotes ? (
        <Disclosure title={t('tastingNotes')}>
          <Paragraphs text={product.tastingNotes} />
        </Disclosure>
      ) : null}

      <Disclosure title={t('details')}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-500">{t('format')}</dt>
          <dd>{tc(`formats.${product.format}`)}</dd>
          {product.origin ? (
            <>
              <dt className="text-ink-500">{t('origin')}</dt>
              <dd>{product.origin}</dd>
            </>
          ) : null}
          {product.caffeineLevel ? (
            <>
              <dt className="text-ink-500">{t('caffeine')}</dt>
              <dd>{t(`caffeineLevels.${product.caffeineLevel}`)}</dd>
            </>
          ) : null}
          <dt className="text-ink-500">{t('sku')}</dt>
          <dd className="font-mono text-xs leading-5">
            {product.variants.map((variant) => variant.sku).join(', ')}
          </dd>
        </dl>
      </Disclosure>
    </div>
  );
}

/** Delivery and payment facts generated from the configured methods (never hard-coded promises). */
export async function DeliveryInfo({ options }: { options: CheckoutOptionsDto | null }) {
  const t = await getTranslations('Product');
  const tco = await getTranslations('Checkout');
  const tc = await getTranslations('Common');
  const locale = await getLocale();
  const currency = tc('currency.UZS');

  return (
    <section
      aria-labelledby="delivery-info"
      className="rounded-[var(--radius-card)] border border-ivory-200 bg-white p-5"
    >
      <h2 id="delivery-info" className="flex items-center gap-2 font-semibold text-forest-900">
        <Truck aria-hidden className="h-5 w-5 text-gold-700" />
        {t('delivery')}
      </h2>
      {options && options.deliveryMethods.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          {options.deliveryMethods.map((method) => (
            <li key={method.code} className="flex flex-wrap justify-between gap-x-4">
              <span>
                {method.name}
                {method.estimate ? (
                  <span className="text-ink-500"> · {method.estimate}</span>
                ) : null}
              </span>
              <span className="font-medium text-forest-900">
                {Number(method.price) === 0
                  ? tco('free')
                  : formatMoney(method.price, locale, currency)}
                {method.freeFromAmount ? (
                  <span className="block text-right text-xs font-normal text-leaf-600">
                    {tco('freeFrom', {
                      amount: formatMoney(method.freeFromAmount, locale, currency),
                    })}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-700">{t('deliveryText')}</p>
      )}
      {options && options.paymentMethods.length > 0 ? (
        <p className="mt-4 flex items-center gap-2 border-t border-ivory-200 pt-4 text-sm text-ink-700">
          <CreditCard aria-hidden className="h-4 w-4 text-gold-700" />
          {options.paymentMethods.map((method) => tco(`paymentMethods.${method}`)).join(' · ')}
        </p>
      ) : null}
      <Link
        href="/delivery"
        className="mt-4 inline-block text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
      >
        {t('deliveryLink')}
      </Link>
    </section>
  );
}
