import type { CartDto, CheckoutQuoteDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { ReceiptLines, ReceiptTotals } from '@/components/payments/receipt';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';

export function OrderSummary({
  cart,
  quote,
  quoteLoading,
  deliveryEnabled,
}: {
  cart: CartDto;
  quote: CheckoutQuoteDto | null;
  quoteLoading: boolean;
  deliveryEnabled: boolean;
}) {
  const t = useTranslations('Checkout');
  let delivery;
  if (deliveryEnabled) {
    delivery = quote ? (
      Number(quote.deliveryFee) === 0 ? (
        t('free')
      ) : (
        <Price amount={quote.deliveryFee} />
      )
    ) : quoteLoading ? (
      t('calculating')
    ) : (
      t('deliveryTbd')
    );
  }
  return (
    <>
      <ReceiptLines items={cart.lines} />
      <ReceiptTotals
        subtotal={quote?.subtotal ?? cart.subtotal}
        delivery={delivery}
        discount={quote?.discountTotal}
        total={quote?.total ?? (deliveryEnabled ? undefined : cart.subtotal)}
      />
      <Link
        href="/cart"
        className="mt-1 inline-flex min-h-11 items-center text-body-sm font-semibold text-brand underline underline-offset-4"
      >
        {t('editCart')}
      </Link>
    </>
  );
}
