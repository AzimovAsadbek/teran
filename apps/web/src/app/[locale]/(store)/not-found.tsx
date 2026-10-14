import { getTranslations } from 'next-intl/server';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { ButtonLink } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('Errors');
  const tn = await getTranslations('Nav');
  return (
    <div className="container-page flex flex-col items-center py-section text-center">
      <span className="h-32 w-32">
        <TeaTypeArt kind="white" />
      </span>
      <p className="mt-8 text-eyebrow text-accent-fg">404</p>
      <h1 className="mt-3 text-display-lg text-forest-900">{t('notFoundTitle')}</h1>
      <p className="mt-4 max-w-md text-body-lg text-fg-muted">{t('notFoundText')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">{t('backHome')}</ButtonLink>
        <ButtonLink href="/catalog" variant="secondary">
          {tn('shopAll')}
        </ButtonLink>
      </div>
    </div>
  );
}
