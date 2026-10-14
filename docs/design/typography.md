# Typography

How TERAN sets type in Uzbek (default), Russian and English. Tokens live in
[`apps/web/src/styles/globals.css`](../../apps/web/src/styles/globals.css); fonts are loaded in
[`apps/web/src/styles/fonts.ts`](../../apps/web/src/styles/fonts.ts).

## Requirements

- **Uzbek first.** Every face must draw **ʻ** (U+02BB, _oʻ_, _gʻ_) and **ʼ** (U+02BC, _maʼlumot_)
  itself. A missing glyph falls back to a system font in the middle of a word.
- **Cyrillic** for the Russian version, with the same voice as the Latin.
- **Two roles.** A display face that suits the wordmark's classical, Trajan-like capitals, and an
  interface face for body text, navigation, forms, prices and the admin.
- **Lining figures.** Prices, quantities, order numbers and dates must not use old-style
  figures, which read as small capitals at interface sizes.
- **Performance and policy.** Self-hosted (the CSP allows no font origins; nothing was changed to
  accommodate a font), variable weights, Latin subsets preloaded, no layout shift.

## Method

1. A specimen page rendered ten display/interface pairings with the same Uzbek, Russian and
   English headline, navigation, product card, price, button, form label and KPI row, at 1440 px.
2. **Glyph test.** For every face, ʻ ʼ ' ’ — « » № and the Cyrillic and Uzbek letters were
   drawn on a canvas twice, with two different fallback fonts. Identical output means the face
   has the glyph; different output means the browser fell back.
3. **Figures.** Numbers were rendered with and without `font-variant-numeric: lining-nums` to see
   each face's defaults.
4. The shortlisted pair was then judged in the real interface: header, product card, checkout
   form and admin table.

## Candidates

| Face                                       | Role tried         | Result                                                                                                                                           |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cormorant Garamond (previous display face) | Display            | Elegant at 60 px, fragile below 24 px; old-style figures by default; hairlines break up on Windows. Rejected.                                    |
| Manrope (previous interface face)          | Interface          | **No ʻ or ʼ**: every _oʻ_ and _gʻ_ in navigation, buttons and forms mixed in a fallback. Rejected (audit finding T1).                            |
| Playfair Display                           | Display            | High contrast reads as fashion and news, not tea; old-style figures. Rejected.                                                                   |
| Noto Serif Display                         | Display            | Complete coverage, but a newspaper voice. Rejected.                                                                                              |
| Literata, Lora                             | Display            | Book faces: comfortable but plain at display sizes. Rejected.                                                                                    |
| Forum, Prata, Spectral                     | Display            | Missing ʻ/ʼ or Uzbek-relevant glyphs in the tested build. Rejected.                                                                              |
| DM Serif Display, DM Sans                  | Display, interface | No Cyrillic. Rejected.                                                                                                                           |
| Golos Text                                 | Interface          | Good Cyrillic, but missing ʻ/ʼ in the tested build. Rejected.                                                                                    |
| Inter                                      | Interface          | Full coverage; neutral to the point of anonymous next to a classical serif. Kept as a fallback idea.                                             |
| **EB Garamond**                            | Display            | **Chosen.** Classical Roman capitals in the spirit of the wordmark, sturdy enough for 24 px subheads, lining figures, Latin + Cyrillic, ʻ and ʼ. |
| **Onest**                                  | Interface          | **Chosen.** A contemporary grotesque designed for Latin and Cyrillic together, open counters at 13–15 px, ʻ and ʼ, tabular figures available.    |

## Loading

- `next/font/google` downloads both families at build time and serves them from the site's own
  origin; no request reaches Google at runtime, and the CSP is unchanged.
- One **variable** file per family and subset (weights 400–800 for EB Garamond, 100–900 for
  Onest) instead of one file per weight.
- Only the **Latin** subsets are preloaded (Uzbek and English pages). Cyrillic files are declared
  with `unicode-range` and download only when Russian text is on the page.
- `display: swap` with **size-adjusted fallbacks** generated by `next/font` (Georgia-like for the
  serif, Arial-like for the sans): text paints immediately and barely moves when the font
  arrives. Lighthouse reports a layout shift of 0–0.001 on every measured page.
- The same font variables are applied by every root layout, including the global 404 and the
  global error page.

## Type scale

Display roles use EB Garamond at weight 500 (600 looked heavy on Windows). Interface roles use
Onest. Display sizes are fluid with `clamp()`; every bound is in `rem`, so browser zoom and the
user's default font size still scale them.

| Role            | Token / utility                                      | Size                                                   | Line height | Weight                 | Used for                                                     |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------ | ----------- | ---------------------- | ------------------------------------------------------------ |
| Display         | `text-display-xl`                                    | `clamp(2.75rem, 1.45rem + 4.6vw, 5.5rem)` (44–88 px)   | 1.02        | 500, −0.02em           | Hero headline only                                           |
| Page title      | `text-display-lg`                                    | `clamp(2.25rem, 1.6rem + 2.3vw, 3.75rem)` (36–60 px)   | 1.06        | 500, −0.015em          | Every `<h1>`, product name on its page                       |
| Section title   | `text-display-md`                                    | `clamp(1.875rem, 1.5rem + 1.3vw, 2.75rem)` (30–44 px)  | 1.1         | 500                    | Section `<h2>`, admin page titles                            |
| Sub-section     | `text-display-sm`                                    | `clamp(1.5rem, 1.35rem + 0.55vw, 1.875rem)` (24–30 px) | 1.15        | 500                    | Drawer and dialog titles, card and form-section headings     |
| Product title   | `text-title` / `text-title-sm`                       | 17 px / 15 px                                          | 1.35        | 600                    | Product cards (15 px on phones), bag lines, order lines      |
| Interface title | `text-title-lg`                                      | 20 px                                                  | 1.3         | 600                    | Admin panels, totals, KPI-adjacent headings                  |
| Body large      | `text-body-lg`                                       | 18 px                                                  | 1.65        | 400                    | Intros, hero text, article body                              |
| Body            | `text-body`                                          | 16 px                                                  | 1.6         | 400                    | Default text, form values                                    |
| Supporting text | `text-body-sm`                                       | 14 px                                                  | 1.55        | 400                    | Secondary text, tables, filters                              |
| Navigation      | `text-nav`                                           | 15 px                                                  | 1.25        | 500                    | Header links and menu triggers                               |
| Buttons         | `text-button`                                        | 15 px                                                  | 1.25        | 600                    | Medium buttons and text actions (small: 14 px, large: 16 px) |
| Labels          | `text-label`                                         | 14 px                                                  | 1.35        | 600                    | Form labels, legends, small group headings                   |
| Helper text     | `text-helper`                                        | 13 px                                                  | 1.45        | 400                    | Hints under fields, notes, legal small print                 |
| Validation      | `text-helper` + `font-medium` + danger colour + icon | 13 px                                                  | 1.45        | 500                    | Field errors (always with an icon and words)                 |
| Caption         | `text-caption`                                       | 12 px                                                  | 1.4         | 500                    | Counts, badges, timestamps                                   |
| Eyebrow         | `text-eyebrow`                                       | 12 px                                                  | 1.3         | 600, uppercase, 0.14em | Short labels above headings (a few words only)               |

Prices: product cards 14 px (phones) / 16 px, semibold; product page 28 px semibold; totals
20 px (`text-title-lg`).

## Rules

- **Measure.** Body copy stays within about 70 characters (`max-w-prose`, `max-w-2xl`).
- **Wrapping.** Display headings use `text-wrap: balance`; long intros use `text-balance` where a
  single word would otherwise sit alone on the last line.
- **Figures.** Onest's proportional lining figures are the default everywhere, prices included:
  tabular spacing leaves visible gaps around the digit 1 (`1 23,000`). Tabular figures (the
  `figures` utility) are used only where a number changes in place: the quantity stepper, the
  bag count badge and the gallery counter. Columns of prices align on their right edge.
- **Capitals.** Uppercase is limited to eyebrows and badges, never to sentences or buttons.
- **Apostrophes.** Uzbek uses ʻ (U+02BB) and ʼ (U+02BC); English uses ’ (U+2019, for example
  _Nature’s_). Straight quotes are not used in display text.
- **No-break spaces.** In all three languages a dash stays on the line of the word before it
  (`word — next`). In Russian, one-letter prepositions and conjunctions (в, к, с, у, о, и,
  а, я) are bound to the following word. Both rules are applied in the message files and the
  long-form page content (`apps/web/src/content/pages`), so a line never starts with a dash or
  ends with _в_.
- **Weights.** Display 500; interface 400 (text), 500 (navigation, captions), 600 (titles,
  labels, buttons). Bold (700) appears only in counters and badges.

## Verification

- Glyph test passed for EB Garamond and Onest on every character above.
- Rendered Uzbek pages (`/`, `/catalog`, `/products/…`, `/about`) checked at 390 and 1440 px:
  _oʻ_, _gʻ_, _taʼm_ and _Sovgʻa toʻplamlari_ render in the brand faces with no fallback.
- Russian pages checked for dashes at line starts and hanging prepositions after the no-break
  pass (home hero, catalogue, product, checkout).
- Lighthouse: layout shift 0–0.001 on the home, catalogue and product pages, desktop and mobile.
