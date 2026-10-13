import { getTranslations } from 'next-intl/server';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { ButtonLink } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('Errors');
  const tn = await getTranslations('Nav');
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="h-32 w-32">
        <TeaTypeArt kind="white" />
      </span>
      <p className="text-eyebrow mt-8 text-gold-700">404</p>
      <h1 className="text-display-lg mt-3 text-forest-900">{t('notFoundTitle')}</h1>
      <p className="mt-4 max-w-md text-lg text-ink-700">{t('notFoundText')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">{t('backHome')}</ButtonLink>
        <ButtonLink href="/catalog" variant="secondary">
          {tn('allTeas')}
        </ButtonLink>
      </div>
    </div>
  );
}
