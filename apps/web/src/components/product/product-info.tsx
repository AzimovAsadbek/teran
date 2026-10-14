import type { CheckoutOptionsDto, ProductAttributeDto, ProductDetailDto } from '@teran/contracts';
import { ChevronDown, CreditCard, Scale, Thermometer, Timer, Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
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
    <details open={open} className="group border-b border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-title text-fg transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden
          className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="pb-6 text-body text-fg-muted">{children}</div>
    </details>
  );
}

/** Paragraphs from plain text (never rendered as HTML). */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="max-w-prose space-y-3">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function minutes(seconds: number): string {
  return Number.isInteger(seconds / 60) ? String(seconds / 60) : (seconds / 60).toFixed(1);
}

/** An attribute value as text: options, yes/no, a number with its unit, or plain text. */
function attributeValue(
  attribute: ProductAttributeDto,
  t: (key: 'yes' | 'no') => string,
): string | null {
  switch (attribute.kind) {
    case 'SELECT':
    case 'MULTI_SELECT':
      return attribute.options.map((option) => option.label).join(', ') || null;
    case 'BOOLEAN':
      return attribute.boolean === null ? null : t(attribute.boolean ? 'yes' : 'no');
    case 'NUMBER':
      return attribute.number === null
        ? null
        : [attribute.number, attribute.unit].filter(Boolean).join(' ');
    default:
      return attribute.text;
  }
}

/** Description, ingredients, brewing and details — only sections the product data supports. */
export async function ProductInfo({ product }: { product: ProductDetailDto }) {
  const t = await getTranslations('Product');
  const tc = await getTranslations('Catalog');
  const characteristics = product.attributes
    .map((attribute) => ({ attribute, value: attributeValue(attribute, (key) => t(key)) }))
    .filter((entry): entry is { attribute: ProductAttributeDto; value: string } =>
      Boolean(entry.value),
    );

  return (
    <div className="mt-10 border-t border-line">
      {product.description ? (
        <Disclosure title={t('description')} open>
          <Paragraphs text={product.description} />
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

      {characteristics.length > 0 ? (
        <Disclosure title={t('characteristics')} open>
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-body-sm">
            {characteristics.map(({ attribute, value }) => (
              <div key={attribute.key} className="contents">
                <dt className="text-fg-subtle">{attribute.label}</dt>
                {/* Plain text from the product data, never HTML. */}
                <dd className="whitespace-pre-line text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      ) : null}

      <Disclosure title={t('details')}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-body-sm">
          <dt className="text-fg-subtle">{t('format')}</dt>
          <dd>{tc(`formats.${product.format}`)}</dd>
          {product.origin ? (
            <>
              <dt className="text-fg-subtle">{t('origin')}</dt>
              <dd>{product.origin}</dd>
            </>
          ) : null}
          {product.caffeineLevel ? (
            <>
              <dt className="text-fg-subtle">{t('caffeine')}</dt>
              <dd>{t(`caffeineLevels.${product.caffeineLevel}`)}</dd>
            </>
          ) : null}
          <dt className="text-fg-subtle">{t('sku')}</dt>
          <dd className="font-mono text-helper leading-5">
            {product.variants.map((variant) => variant.sku).join(', ')}
          </dd>
        </dl>
      </Disclosure>
    </div>
  );
}

/** Brewing guidance from the product data as an attribute row (temperature · time · amount). */
export async function BrewingFacts({ brewing }: { brewing: ProductDetailDto['brewing'] }) {
  if (!brewing) return null;
  const t = await getTranslations('Product');
  const tb = await getTranslations('Brewing');
  const facts = [
    brewing.temperatureCelsius !== null
      ? {
          icon: Thermometer,
          label: tb('temperature'),
          value: tb('celsius', { value: brewing.temperatureCelsius }),
        }
      : null,
    brewing.timeMinSeconds !== null
      ? {
          icon: Timer,
          label: tb('time'),
          value:
            brewing.timeMaxSeconds !== null && brewing.timeMaxSeconds !== brewing.timeMinSeconds
              ? tb('minutes', {
                  min: minutes(brewing.timeMinSeconds),
                  max: minutes(brewing.timeMaxSeconds),
                })
              : tb('minutesSingle', { min: minutes(brewing.timeMinSeconds) }),
        }
      : null,
    brewing.amountGrams !== null
      ? {
          icon: Scale,
          label: tb('amount'),
          value: tb('gramsPerCup', { grams: Number(brewing.amountGrams) }),
        }
      : null,
  ].filter((fact) => fact !== null);
  if (facts.length === 0) return null;
  const columns = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'][facts.length - 1];

  return (
    <section aria-labelledby="brewing-facts" className="mt-8">
      <h2 id="brewing-facts" className="text-label text-fg">
        {t('brewing')}
      </h2>
      <dl
        className={cn(
          'mt-2.5 grid divide-x divide-line rounded-card border border-line bg-surface',
          columns,
        )}
      >
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0 px-3 py-3.5 sm:px-4">
            <dt className="flex items-center gap-1.5 text-caption text-fg-subtle">
              <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-fg" />
              {label}
            </dt>
            <dd className="mt-1 text-title-sm text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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
    <section aria-labelledby="delivery-info" className="mt-8">
      <h2 id="delivery-info" className="text-label text-fg">
        {t('delivery')}
      </h2>
      <ul className="mt-2.5 divide-y divide-line-subtle rounded-card border border-line bg-surface text-body-sm">
        {options && options.deliveryMethods.length > 0 ? (
          options.deliveryMethods.map((method) => (
            <li key={method.code} className="flex items-start gap-3 px-4 py-3">
              <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
              <span className="min-w-0 flex-1">
                <span className="block text-fg">{method.name}</span>
                {method.estimate ? (
                  <span className="block text-helper text-fg-subtle">{method.estimate}</span>
                ) : null}
              </span>
              <span className="text-right">
                <span className="block font-medium text-fg">
                  {Number(method.price) === 0
                    ? tco('free')
                    : formatMoney(method.price, locale, currency)}
                </span>
                {method.freeFromAmount ? (
                  <span className="block text-helper text-success">
                    {tco('freeFrom', {
                      amount: formatMoney(method.freeFromAmount, locale, currency),
                    })}
                  </span>
                ) : null}
              </span>
            </li>
          ))
        ) : (
          <li className="flex items-start gap-3 px-4 py-3 text-fg-muted">
            <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
            {t('deliveryText')}
          </li>
        )}
        {options && options.paymentMethods.length > 0 ? (
          <li className="flex items-start gap-3 px-4 py-3 text-fg">
            <CreditCard aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
            {/* Only methods that can be used now; simulated ones say so. */}
            {options.paymentOptions
              .filter((option) => option.availability !== 'unavailable')
              .map((option) =>
                option.availability === 'demo'
                  ? `${tco(`paymentMethods.${option.method}`)} (${tco('demoBadge')})`
                  : tco(`paymentMethods.${option.method}`),
              )
              .join(' · ')}
          </li>
        ) : null}
      </ul>
      <Link
        href="/delivery"
        className="mt-3 inline-block text-body-sm font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
      >
        {t('deliveryLink')}
      </Link>
    </section>
  );
}
