import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('Home');
  return (
    <main className="container-page py-24">
      <p className="text-eyebrow text-gold-700">{t('heroEyebrow')}</p>
      <h1 className="text-display-xl mt-4 text-forest-900">{t('heroTitle')}</h1>
    </main>
  );
}
