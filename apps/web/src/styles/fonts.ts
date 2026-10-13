import { Cormorant_Garamond, Manrope } from 'next/font/google';

/*
 * Brand typefaces, self-hosted by next/font (no request to Google at runtime). Shared by every
 * root layout: the locale tree, the global 404 and the global error page.
 */

const display = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

/** Class names that define the font variables used by the design tokens; put them on <html>. */
export const fontVariables = `${display.variable} ${sans.variable}`;
