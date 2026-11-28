import { Link2Off, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';

export function PaymentLinkState({ loading = false }: { loading?: boolean }) {
  const t = useTranslations('Checkout');
  const Icon = loading ? LoaderCircle : Link2Off;
  return (
    <section className="mx-auto max-w-xl rounded-card border border-line bg-surface p-6 sm:p-9">
      <Icon
        aria-hidden
        className={loading ? 'size-7 text-brand motion-safe:animate-spin' : 'size-7 text-fg-muted'}
      />
      <div role="status" className="mt-4">
        <h1 className="font-heading text-[2rem] leading-tight text-fg">
          {t(loading ? 'checkingStatus' : 'invalidPaymentLink')}
        </h1>
        <p className="mt-2 text-body text-fg-muted">
          {t(loading ? 'checkingNote' : 'invalidPaymentLinkNote')}
        </p>
      </div>
      {!loading && (
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/account/orders">{t('myOrders')}</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            {t('support')}
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
