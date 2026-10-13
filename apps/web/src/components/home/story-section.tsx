import { Gem, Leaf, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Emblem } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';

/** Brand philosophy built only on the values TERAN states for itself (Natural · Quality · Elegance). */
export async function StorySection() {
  const t = await getTranslations('Home');
  const values = [
    { icon: Leaf, title: t('valueNatural'), text: t('valueNaturalText') },
    { icon: Gem, title: t('valueQuality'), text: t('valueQualityText') },
    { icon: Sparkles, title: t('valueElegance'), text: t('valueEleganceText') },
  ];

  return (
    <section aria-labelledby="story-title" className="bg-ivory-100">
      <Reveal className="container-page grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:py-28">
        <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-gold-500/40" />
          <span aria-hidden className="absolute inset-6 rounded-full border border-gold-500/25" />
          <span aria-hidden className="absolute inset-12 rounded-full bg-ivory-50 shadow-soft" />
          <Emblem className="relative w-1/2" sizes="(min-width: 1024px) 220px, 45vw" />
        </div>
        <div>
          <p className="text-eyebrow text-gold-700">{t('storyEyebrow')}</p>
          <h2 id="story-title" className="text-display-lg mt-4 text-forest-900">
            {t('storyTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">{t('storyText')}</p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/50 text-gold-700">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-xl font-semibold text-forest-900">{title}</p>
                <p className="mt-1 text-sm text-ink-700">{text}</p>
              </li>
            ))}
          </ul>
          <ButtonLink href="/about" variant="secondary" className="mt-10">
            {t('storyCta')}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
