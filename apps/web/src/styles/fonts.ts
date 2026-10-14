import { EB_Garamond, Onest } from 'next/font/google';

/*
 * Brand typefaces (docs/design/typography.md), self-hosted by next/font: no request to Google at
 * runtime, size-adjusted local fallbacks so text does not jump when the fonts arrive. Shared by
 * every root layout: the locale tree, the global 404 and the global error page.
 *
 * - EB Garamond (display): classical Roman letterforms that echo the TERAN wordmark; lining
 *   figures; full Latin, Cyrillic and Uzbek coverage (including ʻ and ʼ).
 * - Onest (interface): a contemporary grotesque drawn for Latin and Cyrillic; lining figures, with
 *   tabular figures available for counters; covers ʻ and ʼ, which the previous interface font
 *   (Manrope) lacked.
 *
 * `subsets` only decides what is preloaded. Latin covers Uzbek and English, the default and most
 * visited versions; Cyrillic files are declared with `unicode-range` and load for Russian text.
 */

const display = EB_Garamond({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-eb-garamond',
  display: 'swap',
});

const sans = Onest({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-onest',
  display: 'swap',
});

/** Class names that define the font variables used by the design tokens; put them on <html>. */
export const fontVariables = `${display.variable} ${sans.variable}`;
