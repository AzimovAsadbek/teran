# Design system

The visual language of the TERAN storefront and admin. Tokens live in
[`apps/web/src/styles/globals.css`](../../apps/web/src/styles/globals.css) (Tailwind CSS v4,
CSS-first `@theme`); components in `apps/web/src/components`.

## Sources

| Source                                  | Used for                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TERAN logo (raster, 1774×887, supplied) | Colours, emblem, wordmark. Used as supplied; nothing redrawn or re-typeset.                         |
| TERAN concept screenshot                | Brand mood only: deep forest green, gold accents, ivory surfaces, classical serif headlines.        |
| DAVIDsTEA                               | Page structure, navigation and shopping patterns (see the [reference audit](./reference-audit.md)). |

The concept screenshot's composition is deliberately not reproduced, and no DAVIDsTEA copy,
imagery, illustration style or palette is used ([ADR-015](../architecture/decisions.md)).

## Colour

Colours measured on the logo: deep greens `#01250D`–`#0F4119` with botanical highlights
`#406D1E` and `#55A92A`; golds `#AE781D` and `#C58D35` with highlights `#EAB248` and `#F9E988`.
The token scales below are derived from them and tuned for contrast on ivory and forest surfaces.

| Scale    | Tokens                                                                                                        | Role                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `forest` | 950 `#061f10` · 900 `#0b2e19` · 800 `#123f24` · 700 `#1a5530`                                                 | Brand surfaces (header bar, footer, primary buttons), headings, focus ring                           |
| `leaf`   | 600 `#2f6b2c` · 500 `#3e8535` · 300 `#8db86a` · 100 `#e4edd9`                                                 | Positive states (in stock, success), category badges                                                 |
| `gold`   | 800 `#6b4c10` · 700 `#876118` · 600 `#a87a24` · 500 `#c5963a` · 400 `#d8b160` · 300 `#e7c878` · 100 `#f5eacb` | Accents: eyebrows and links on light (700), text on dark (300), gold button (500), notices (100/800) |
| `ivory`  | 50 `#fcfaf4` · 100 `#f6f0e3` · 200 `#ece3d0` · 300 `#e0d3b8`                                                  | Page background and panels, borders                                                                  |
| `sage`   | 100 `#eef1e8` · 200 `#d6ddcb` · 300 `#b9c3ad` · 500 `#7e8975`                                                 | Quiet surfaces, form field borders (500)                                                             |
| `ink`    | 900 `#1c211d` · 700 `#3a423c` · 500 `#5d665f`                                                                 | Body text, secondary text, captions                                                                  |
| `danger` | 700 `#a8261d` · 100 `#f9e3e0`                                                                                 | Errors and destructive actions                                                                       |

There is no dark theme; `color-scheme: light` and the browser theme colour is forest-900.

### Contrast (WCAG 2.2 AA)

Every text and background pairing used in the interface meets AA (4.5:1 for text, 3:1 for
large text and non-text indicators). Ratios computed from the tokens:

| Foreground on background                  | Ratio               | Foreground on background             | Ratio       |
| ----------------------------------------- | ------------------- | ------------------------------------ | ----------- |
| ink-900 on ivory-50                       | 15.66               | gold-300 on forest-900               | 9.11        |
| ink-700 on ivory-50 / ivory-100 / white   | 9.94 / 9.13 / 10.37 | gold-300 on forest-950               | 10.68       |
| ink-500 on ivory-50 / ivory-100 / white   | 5.70 / 5.24 / 5.95  | forest-950 on gold-500 (gold button) | 6.44        |
| ivory-50 on forest-900                    | 14.18               | gold-800 on gold-100 (notices)       | 6.57        |
| gold-700 on ivory-50 / ivory-100 / white  | 5.36 / 4.93 / 5.60  | danger-700 on danger-100 / white     | 5.77 / 7.09 |
| leaf-600 on leaf-100                      | 5.34                | ink-700 on sage-200                  | 7.44        |
| ivory-100 at 85 % on forest-950 (footer)  | 11.27               | forest-700 focus ring on ivory-50    | 8.43        |
| sage-500 field border on white (non-text) | 3.67                | gold-300 focus ring on forest-900    | 9.11        |

Rules that keep it that way:

- Gold lighter than 700 is never text on light surfaces (gold-500 on ivory is 2.6:1); it appears
  only in decorative icons and list markers.
- Dark sections carry the `on-dark` class, which switches the focus ring from forest-700 (1.68:1
  on forest-900, not enough) to gold-300.
- Errors are stated in text, never by colour alone.

## Typography

| Role    | Typeface                              | Notes                                                                                    |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Display | Cormorant Garamond (`--font-display`) | Headlines; classical serif echoing the logo. Variable weights, Latin and Cyrillic.       |
| Text/UI | Manrope (`--font-sans`)               | Body, navigation, forms, prices (tabular figures). Variable weights, Latin and Cyrillic. |

Both are self-hosted through `next/font` (`apps/web/src/styles/fonts.ts`), shared by every root
layout including the global 404 and error pages, with `display: swap` and system fallbacks.
Only the Latin subsets are preloaded (Uzbek and English); the Cyrillic files are declared with
`unicode-range` and download when Russian text appears.

| Utility            | Size                                     | Weight / style                  |
| ------------------ | ---------------------------------------- | ------------------------------- |
| `.text-display-xl` | `clamp(2.6rem, 1.4rem + 4.6vw, 5.4rem)`  | 600, display face               |
| `.text-display-lg` | `clamp(2.1rem, 1.4rem + 2.6vw, 3.6rem)`  | 600, display face               |
| `.text-display-md` | `clamp(1.75rem, 1.3rem + 1.4vw, 2.5rem)` | 600, display face               |
| `.text-eyebrow`    | 0.75rem                                  | 700, uppercase, 0.18em tracking |

## Layout, shape and depth

- `.container-page`: max width 88rem, side padding `clamp(1rem, 4vw, 2.5rem)`.
- Tailwind's default breakpoints (sm 40rem, md 48rem, lg 64rem, xl 80rem) and spacing scale.
  Layouts are written mobile first.
- Grids whose columns are defined only from a breakpoint also declare `grid-cols-1` (a
  `minmax(0, 1fr)` track), so long content scrolls inside its panel instead of widening the page.
  The end-to-end suite fails if a phone page scrolls sideways.
- Radii: `--radius-card` 1.25rem, `--radius-panel` 1.75rem; buttons and inputs are pills.
- Shadows: `--shadow-soft` (cards), `--shadow-lift` (hover), `--shadow-glass` (floating glass).
- Touch targets are at least 44 px (`h-11`) for icon buttons and form controls.

## Glass

`.glass` (ivory at 86 % opacity, 18 px blur) and `.glass-dark` (forest at 58 % with a gold
hairline) are reserved for floating UI: the sticky header after scrolling, the hero card and the
mobile purchase bar. Text never sits on glass over busy imagery without enough opacity. Without
`backdrop-filter` support, or with `prefers-reduced-transparency: reduce`, they fall back to solid
ivory-50 or forest-900.

## Motion

- Tokens: `--ease-soft` `cubic-bezier(0.22, 1, 0.36, 1)`; `reveal` 700 ms, `rise` 900 ms
  (transform only, so it never delays the largest contentful paint), `fade-in` 400 ms, `marquee`
  48 s.
- Scroll reveals skip elements already in view and are disabled under reduced motion.
- The category ribbon (marquee) has a pause button; under reduced motion it becomes a static,
  scrollable strip.
- `prefers-reduced-motion: reduce` shortens every animation and transition to near zero and
  disables smooth scrolling.

## Components

| Group      | Components (`apps/web/src/components`)                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitives | `ui/button` (primary, secondary, gold, ghost, light, outline-light; sm/md/lg), `ui/badge`, `ui/field` (text, textarea, select, checkbox, error summary), `ui/price`, `ui/sheet` (native `<dialog>`), `ui/skeleton`, `ui/reveal`, `ui/demo-notice` |
| Layout     | announcement bar, sticky header, desktop mega menus, mobile drawer, header actions, language switcher, footer                                                                                                                                     |
| Brand      | `brand/logo` (wordmark, emblem, stacked logo, logo plate for dark surfaces), `brand/illustrations` (tea-type art, hero landscape)                                                                                                                 |
| Catalogue  | product card with quick add, category tile, listing header, filter bar and mobile filters, sort, pagination, breadcrumbs, product image                                                                                                           |
| Product    | gallery (arrow keys, thumbnails), purchase panel (pack sizes as radios, quantity stepper, sticky mobile bar), product information disclosures                                                                                                     |
| Commerce   | bag drawer and page, checkout form with choice cards and order summary, order progress and details                                                                                                                                                |
| Content    | page header with draft notice, long-form legal pages with table of contents and highlighted `[placeholders]`, article body (plain text), help footer                                                                                              |
| Admin      | shell with grouped navigation, tables and status pills, filter forms, confirm dialog, editors for products, images, translations, taxonomy, stock, orders, delivery, settings, staff, articles and enquiries                                      |

### Navigation pattern

Announcement bar (forest) → sticky header with menu button (phones), desktop mega menus for teas,
collections and about (WAI-ARIA disclosure buttons, open on click or hover, Esc closes and returns
focus), centred wordmark, search, account and bag. The bag opens as a side drawer after adding a
product. Phones get a full-height drawer with category tiles, collections, links and the language
switcher.

## Imagery

- **Brand assets** are generated from the supplied raster by `apps/web/scripts/generate-brand-assets.mjs`
  (run by hand). White is removed by an exact colour-to-alpha un-multiply, then the logo is cropped
  — geometry measured on the 1774×887 original, as `left, top, width, height`:

  | Asset     | Crop                                                                                               | Output                                 |
  | --------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
  | Full logo | `230, 10, 1314, 866`                                                                               | `public/brand/teran-logo` 1200×785     |
  | Emblem    | `560, 10, 660, 572`                                                                                | `public/brand/teran-emblem` 612×560    |
  | Wordmark  | `230, 550, 1314, 326`, then the emblem's gold tip above the letters is cleared (`470, 0, 340, 42`) | `public/brand/teran-wordmark` 1200×289 |

  PNG and WebP copies are written; the web app imports the PNGs through `next/image`, which serves
  modern formats. Favicon, app icons (emblem on ivory) and the default social image (1200×630)
  come from the same script.

- **Product photos** are uploaded in the admin and served as WebP renditions with `srcset`
  ([ADR-009](../architecture/decisions.md)). Until real photography exists, the seed draws
  demonstration pack shots and leaf studies in code ([ADR-014](../architecture/decisions.md)).
- **Illustrations** (hero landscape, ten tea-type motifs) are inline SVG components, also used as
  the placeholder when a product has no photo.
- **Alternative text:** product images use the product name (plus "demonstration image" in demo
  mode); decorative art is hidden from assistive technology.

## Accessibility patterns

- Skip link to `#main` in the store and the admin; landmarks with labelled navigation regions.
- Dialogs (bag, search, menu, filters, confirmations) use the native `<dialog>` with `showModal()`:
  focus is contained, Esc closes, focus returns to the opener, and the page behind does not scroll.
- Forms: visible labels, "(optional)" on optional fields, hints and errors linked with
  `aria-describedby`, `aria-invalid`, an error summary with `role="alert"`, and focus moved to the
  first invalid field. Validation messages are translated keys shared with the API.
- Live regions announce search results, result counts, add-to-bag status and order totals.
- Choices use native radios (pack sizes, brewing guide, delivery and payment), so arrow keys work
  without custom scripting.
- Charts in the admin are hidden from assistive technology and duplicated as a visually hidden
  table.
- Verified by the end-to-end suite: no sideways scrolling on phones; keyboard-reachable dialogs
  and forms are exercised in the journeys.

## Numbers and dates

Prices and dates use CLDR conventions per language and look the same on the server and in every
browser: `56 000 soʻm` / `56 000 сум` / `56,000 UZS`, `5-oktabr, 2026` / `5 октября 2026 г.` /
`October 5, 2026`, always in Tashkent time. Numbers (all languages) and Uzbek dates are formatted
in `apps/web/src/lib/format.ts` rather than by `Intl`, because Chromium has no Uzbek locale data
([ADR-019](../architecture/decisions.md)).

## Voice and content

Texts exist in Uzbek (default), Russian and English with identical keys, arguments and tags
(`pnpm lint` checks parity). Copy states only what TERAN has confirmed: no invented origins,
health benefits, certifications, reviews or ratings. Facts still to be supplied appear as
highlighted `[placeholders]`; see [business information required](../business-information-required.md).
