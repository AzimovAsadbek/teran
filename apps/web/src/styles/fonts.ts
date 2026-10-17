import { Fraunces, Merriweather, Nunito, Oswald } from 'next/font/google';

/*
 * Storefront typefaces, chosen to reproduce the reference's three roles with open-licence fonts
 * (docs/design/reference-map.md): the reference's own fonts are commercial and are not copied.
 * Self-hosted by next/font: no request to Google at runtime, size-adjusted local fallbacks so text
 * does not jump when the fonts arrive. Shared by every root layout.
 *
 * - Oswald (condensed display, the reference's Alternate Gothic role): banner, hero and tile
 *   headlines in capitals. A reworking of the Alternate Gothic style; Latin and Cyrillic.
 * - Fraunces (soft heavy serif, the reference's Oxtail role): section headings. Latin only, so
 *   Merriweather (heavy, Cyrillic) takes over for Russian text in the same font stack.
 * - Nunito (rounded interface sans, the reference's Omnes role): body, navigation, buttons.
 *
 * `subsets` only decides what is preloaded. Latin covers Uzbek and English, the default and most
 * visited versions; Cyrillic files are declared with `unicode-range` and load for Russian text.
 */

const condensed = Oswald({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-oswald',
  display: 'swap',
});

// Only the SOFT axis: with the optical-size axis as well the file is twice as large (121 KB
// instead of 62 KB) for a difference barely visible at heading sizes.
const display = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['SOFT'],
  variable: '--font-fraunces',
  display: 'swap',
  // Section headings are rarely the first thing painted: not preloaded, so the page's largest
  // picture and the two other fonts get the connection first (the metric-matched fallback keeps
  // the swap from moving anything).
  preload: false,
});

const displayCyrillic = Merriweather({
  subsets: ['cyrillic'],
  weight: ['900'],
  variable: '--font-merriweather',
  display: 'swap',
  preload: false,
});

const sans = Nunito({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-nunito',
  display: 'swap',
});

/** Class names that define the font variables used by the design tokens; put them on <html>. */
export const fontVariables = `${condensed.variable} ${display.variable} ${displayCyrillic.variable} ${sans.variable}`;
