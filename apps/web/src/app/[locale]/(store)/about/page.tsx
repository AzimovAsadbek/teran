import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Blocks } from '@/components/content/long-form';
import { PageHeader } from '@/components/content/page-header';
import { ButtonLink } from '@/components/ui/button';
import { aboutPage } from '@/content/pages/about';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  return pageMetadata({ title: page.title, description: page.description, href: '/about', locale });
}

const VALUE_ART = { nature: 'green', quality: 'black', elegance: 'white' } as const;

export default async function AboutPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  const tn = await getTranslations('Nav');
  const tp = await getTranslations('Pages');
  const values = page.sections.filter((section) => section.id in VALUE_ART);
  const range = page.sections.find((section) => section.id === 'range');
  const story = page.sections.find((section) => section.id === 'story');

  return (
    <>
      <PageHeader eyebrow="TERAN" title={page.title} intro={page.intro} illustration="green" />

      <section aria-label={page.title} className="container-page py-16 sm:py-24">
        <ul className="grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <li key={value.id} className="rounded-[var(--radius-panel)] bg-white p-8 shadow-soft">
              <span aria-hidden className="block h-20 w-20">
                <TeaTypeArt kind={VALUE_ART[value.id as keyof typeof VALUE_ART]} />
              </span>
              <h2 className="mt-6 font-display text-3xl font-semibold text-forest-900">
                {value.heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-ink-700">
                <Blocks blocks={value.blocks} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {range ? (
        <section aria-labelledby="range-title" className="bg-forest-900 text-ivory-50">
          <div className="container-page grid items-center gap-8 py-16 sm:py-20 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-2xl">
              <h2 id="range-title" className="text-display-md text-ivory-50">
                {range.heading}
              </h2>
              <div className="mt-4 space-y-3 text-lg leading-relaxed text-ivory-100/90">
                <Blocks blocks={range.blocks} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/catalog" variant="gold" size="lg">
                {tp('shopTeas')}
              </ButtonLink>
              <ButtonLink href="/wholesale" variant="outline-light" size="lg">
                {tn('wholesale')}
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {story ? (
        <section aria-labelledby="story-title" className="container-page py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2 id="story-title" className="text-display-md text-forest-900">
              {story.heading}
            </h2>
            <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink-700">
              <Blocks blocks={story.blocks} />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
