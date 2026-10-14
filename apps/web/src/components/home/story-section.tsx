import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Emblem } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { BrandPrinciples } from '@/components/content/brand-principles';
import { brandCopy } from '@/content/brand';

/**
 * The brand philosophy (official copy): heading and the three principles beside the emblem, with
 * a link to the full story on the About page.
 */
export async function StorySection() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const { philosophy } = brandCopy[locale];

  return (
    <section aria-labelledby="philosophy-title" className="border-y border-line-subtle bg-surface">
      <Reveal className="container-page grid grid-cols-1 items-center gap-12 py-section lg:grid-cols-12 lg:gap-16">
        <div className="relative mx-auto flex aspect-square w-full max-w-[20rem] items-center justify-center lg:col-span-5 lg:max-w-[26rem]">
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
          <h2 id="philosophy-title" className="mt-4 max-w-[20ch] text-display-lg text-forest-900">
            {philosophy.heading}
          </h2>
          <BrandPrinciples locale={locale} className="mt-10" />
          <ButtonLink href="/about" variant="secondary" className="mt-10">
            {t('storyCta')}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
