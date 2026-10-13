import { Cormorant_Garamond, Manrope } from 'next/font/google';

/*
 * Brand typefaces, self-hosted by next/font (no request to Google at runtime). Shared by every
 * root layout: the locale tree, the global 404 and the global error page.
 *
 * `subsets` only decides what is preloaded. Latin covers Uzbek (including ʻ) and English, the
 * default and most visited versions; the Cyrillic files are still declared through
 * `unicode-range` and download when Russian text appears, instead of on every page.
 */

const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

/** Class names that define the font variables used by the design tokens; put them on <html>. */
export const fontVariables = `${display.variable} ${sans.variable}`;
