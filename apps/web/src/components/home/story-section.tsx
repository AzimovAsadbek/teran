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
    <section aria-labelledby="story-title" className="border-y border-line-subtle bg-surface">
      <Reveal className="container-page grid grid-cols-1 items-center gap-12 py-section lg:grid-cols-12 lg:gap-16">
        <div className="relative mx-auto flex aspect-square w-full max-w-[22rem] items-center justify-center lg:col-span-5 lg:max-w-[26rem]">
          <span aria-hidden className="absolute inset-0 rounded-full border border-gold-500/35" />
          <span
            aria-hidden
            className="absolute inset-[7%] rounded-full border border-gold-500/20"
          />
          <span aria-hidden className="absolute inset-[14%] rounded-full bg-canvas shadow-soft" />
          <Emblem className="relative w-[46%]" sizes="(min-width: 1024px) 200px, 45vw" />
        </div>
        <div className="lg:col-span-7">
          <p className="text-eyebrow text-accent-fg">{t('storyEyebrow')}</p>
          <h2 id="story-title" className="mt-4 max-w-[18ch] text-display-lg text-forest-900">
            {t('storyTitle')}
          </h2>
          <p className="mt-6 max-w-2xl text-body-lg text-fg-muted">{t('storyText')}</p>
          <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <li key={title} className="border-t border-line pt-5">
                <p className="flex items-center gap-2.5 text-display-xs text-forest-900">
                  <Icon aria-hidden className="h-5 w-5 shrink-0 text-accent-fg" />
                  {title}
                </p>
                <p className="mt-2 text-body-sm text-fg-muted">{text}</p>
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
