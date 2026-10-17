import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ValueMark } from '@/components/brand/ornaments';
import { BRAND_VALUES, brandCopy, brandValueLabels } from '@/content/brand';

/**
 * The reference's "feel-good promise" band under a policy page's banner: a faintly grey card with
 * 24 px corners, a condensed capital title, a short paragraph and a row of teal icons over
 * condensed labels (two by two on phones). TERAN's promise is the pack's: its four values and the
 * brand's line (no shipping or review claims are made).
 */
export async function PromiseCard() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  return (
    <section
      aria-labelledby="promise-title"
      className="px-4 py-7 min-[46.875rem]:px-10 min-[61.875rem]:py-10"
    >
      <div className="mx-auto max-w-[62.5rem] rounded-[1.5rem] bg-[#121212]/4 px-5 py-6 text-center">
        <h2
          id="promise-title"
          className="mb-4 font-headline text-[1.5rem] leading-6 text-[#121212] [--headline-weight:600]"
        >
          {t('valuesTitle')}
        </h2>
        <p className="mx-auto max-w-[37.5rem] text-[1rem] leading-[1.4rem] font-medium text-[#121212]/80">
          {copy.description}
        </p>
        <ul className="mx-auto mt-5 grid max-w-[42rem] grid-cols-2 gap-4 min-[46.875rem]:grid-cols-4 min-[46.875rem]:gap-5">
          {BRAND_VALUES.map((value) => (
            <li key={value} className="flex flex-col items-center gap-[0.3rem]">
              <ValueMark value={value} className="mb-[0.3rem] h-7 w-7 text-[#00a6a5]" />
              <span className="font-headline text-[1rem] leading-[1.2rem] text-[#121212] [--headline-weight:600]">
                {values[value]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
