import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ValueIcon } from '@/components/brand/ornaments';
import { BRAND_VALUES, brandCopy, brandValueLabels } from '@/content/brand';

/**
 * The reference's "feel-good promise" card under a help page's header: a grey rounded card with a
 * condensed title, a short paragraph and a row of icons with two-line labels. TERAN's promise is
 * the pack's: its four values and the brand's line (no shipping or review claims are made).
 */
export async function PromiseCard() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  return (
    <section aria-labelledby="promise-title" className="container-page pt-10">
      <div className="mx-auto flex max-w-[62.5rem] flex-col items-center rounded-[1.25rem] bg-ivory-100 px-6 py-8 text-center">
        <h2
          id="promise-title"
          className="font-headline text-[1.5rem] leading-none text-fg [--headline-weight:600]"
        >
          {t('valuesTitle')}
        </h2>
        <p className="mt-3 max-w-[37rem] text-[1rem] leading-normal text-fg-muted">
          {copy.description}
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:gap-12">
          {BRAND_VALUES.map((value) => (
            <li key={value} className="flex flex-col items-center gap-2">
              <ValueIcon value={value} className="w-9" />
              <span className="max-w-[8rem] font-headline text-[1rem] leading-[1.2] text-fg [--headline-weight:600]">
                {values[value]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
