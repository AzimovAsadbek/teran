# Design system

The visual language of the TERAN storefront and admin. Tokens live in
[`apps/web/src/styles/globals.css`](../../apps/web/src/styles/globals.css) (Tailwind CSS v4,
CSS-first `@theme`); components in `apps/web/src/components`. Typography has its own document:
[typography](./typography.md). Components and their states are listed in the
[component audit](./component-audit.md).

## Sources

| Source                                          | Used for                                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TERAN packaging print files (4 packs, supplied) | Primary source since 2026-10-14: logo as printed, colours, ornaments, artwork, pack shots and the pack's layout ideas ([packaging](./packaging.md)). |
| TERAN logo (raster, 1774×887, supplied earlier) | Superseded by the packaging version; kept in `apps/web/assets/brand` for reference.                                                                  |
| TERAN concept screenshot                        | Brand mood only: deep forest green, gold accents, ivory surfaces, classical serif headlines.                                                         |
| DAVIDsTEA                                       | Page structure, navigation and shopping patterns (see the [reference audit](./reference-audit.md)).                                                  |

The concept screenshot's composition is deliberately not reproduced, and no DAVIDsTEA copy,
imagery, illustration style or palette is used ([ADR-015](../architecture/decisions.md)).

## Colour

Colours measured on the packaging print files, converted with their own ISO Coated v2 profile:
logo green `#1A5317` (shades `#0C410F`–`#185010`, leaf highlights `#207020`–`#27A735`); gold from
`#B87800` to `#E8C820`; the red of the ® and the seal `#E3000F`. The pack colours (XC2025 red
`#C00808`, 8009 green `#207020`, G8810 charcoal `#404040`, 8830 blue `#0078B8`) stay on the packs
themselves; the interface uses only the brand greens and golds.

There are two layers. The **brand palette** keeps the measured scales; components use the
**semantic tokens** on top of it, so a surface or text role changes in one place.

### Brand palette

| Scale    | Tokens                                                                                                                       | Notes                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `forest` | 950 `#082b0d` · 900 `#0e3d12` · 800 `#154a17` · 700 `#1a5317` (logo) · 600 `#236b23`                                         | Brand surfaces, primary buttons, headings, focus ring |
| `leaf`   | 700 `#24601f` · 600 `#2b7a26` · 500 `#2f9431` · 300 `#8fc46f` · 100 `#e3f0d8`                                                | Success                                               |
| `gold`   | 800 `#6b4a00` · 700 `#855c00` · 600 `#b07c00` · 500 `#d0a20a` · 400 `#e2b918` · 300 `#efcf4a` · 100 `#f8edc6` · 50 `#fdf8e8` | Accent, warning                                       |
| `seal`   | `#e3000f`                                                                                                                    | The ® and the 茶叶 seal only; never text or UI        |
| `ivory`  | 50 `#fcfaf4` · 100 `#f6f0e3` · 200 `#ece3d0` · 300 `#e0d3b8`                                                                 | Page and muted surfaces                               |
| `sage`   | 100 `#eef1e8` · 200 `#d6ddcb` · 300 `#b9c3ad` · 500 `#7e8975`                                                                | Field borders, quiet chips                            |
| `ink`    | 900 `#1c211d` · 700 `#3a423c` · 500 `#5d665f`                                                                                | Text                                                  |
| `danger` | 700 `#a8261d` · 100 `#f9e3e0`                                                                                                | Errors and destructive actions                        |

### Semantic tokens

| Token                                                | Value                                         | Role                                                   |
| ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `canvas`                                             | ivory-50                                      | Page background                                        |
| `surface`                                            | white                                         | Cards, panels, fields, drawers' content cards          |
| `surface-muted`                                      | ivory-100                                     | Image wells, quiet panels, table headers               |
| `surface-sunken`                                     | ivory-200                                     | Skeletons, progress tracks, neutral pills              |
| `surface-inverse` / `-deep`                          | forest-900 / forest-950                       | Dark bands, footer, announcement bar                   |
| `fg` / `fg-muted` / `fg-subtle` / `fg-inverse`       | ink-900 / ink-700 / ink-500 / ivory-50        | Text hierarchy                                         |
| `brand`, `brand-hover`, `brand-soft`                 | forest-900, forest-800, sage-100              | Primary actions, selected states, active-filter chips  |
| `accent`, `accent-hover`                             | gold-500, gold-400                            | Marketing buttons on dark or brand surfaces, progress  |
| `accent-fg` / `accent-on-inverse`                    | gold-700 / gold-300                           | Eyebrows and icons on light / on dark                  |
| `line`, `line-subtle`, `line-strong`, `line-inverse` | `#e7dece`, `#f0eadc`, sage-500, ivory at 18 % | Dividers, card borders, field borders, borders on dark |
| `focus` / `focus-inverse`                            | forest-700 / gold-300                         | Focus ring on light / on dark (`.on-dark`)             |
| `success`, `warning`, `danger`, `info` (+ `-soft`)   | leaf-700, gold-800, danger-700, forest-700    | Status text and its tinted background                  |

There is no dark theme; `color-scheme: light` and the browser theme colour is forest-900.

### Contrast (WCAG 2.2 AA)

Computed from the tokens (text needs 4.5:1, large text and non-text indicators 3:1):

| Foreground                                            | Background                              | Ratio              |
| ----------------------------------------------------- | --------------------------------------- | ------------------ |
| fg (ink-900)                                          | canvas / surface                        | 15.66 / 16.35      |
| fg-muted (ink-700)                                    | canvas / surface-muted / surface-sunken | 9.94 / 9.13 / 8.13 |
| fg-subtle (ink-500)                                   | canvas / surface / surface-muted        | 5.70 / 5.95 / 5.24 |
| accent-fg (gold-700)                                  | canvas / surface / surface-muted        | 5.70 / 5.95 / 5.24 |
| brand (forest-900)                                    | canvas                                  | 11.87              |
| fg-inverse (ivory-50)                                 | surface-inverse / surface-inverse-deep  | 11.87 / 14.78      |
| ivory-50 (title bars, ribbon, slogan strip)           | forest-700                              | 8.77               |
| accent-on-inverse (gold-300)                          | surface-inverse / surface-inverse-deep  | 8.08 / 10.06       |
| ivory-100 at 85 % / 70 % (footer links / legal)       | surface-inverse-deep                    | 10.10 / 7.32       |
| forest-950 (accent button text)                       | accent / accent-hover                   | 6.50 / 8.22        |
| success                                               | success-soft / surface                  | 6.40 / 7.59        |
| warning                                               | warning-soft                            | 6.88               |
| danger                                                | danger-soft / surface                   | 5.77 / 7.09        |
| info                                                  | info-soft                               | 8.01               |
| forest-900 (filter chips)                             | brand-soft                              | 10.85              |
| Hero text on its mist (darkest pixel behind any line) | the lake painting                       | ≥ 4.97             |
| line-strong (text-field and select borders, non-text) | surface / canvas                        | 3.67 / 3.52        |
| focus ring (forest-700, non-text)                     | canvas                                  | 8.77               |
| focus ring on dark (gold-300, non-text)               | surface-inverse                         | 8.08               |

Rules that keep it that way:

- Gold lighter than 700 is never text on light surfaces (gold-500 on ivory is 2.3:1).
- Text over artwork sits on a mist or scrim measured against the darkest pixel behind it (the
  hero is checked at desktop and phone sizes in all three languages).
- Text fields and selects keep the full `line-strong` border: their boundary is the only cue that
  identifies an empty field (WCAG 1.4.11). Lighter borders are used only around controls that
  carry their own text or icon.
- Dark sections carry the `on-dark` class, which switches the focus ring to gold-300.
- Errors and statuses are stated in words; colour and the status dot only support them.

## Typography

EB Garamond for display (headings, 500 weight) and Onest for the interface, both self-hosted,
variable and preloaded in Latin only. Display sizes are fluid (`clamp()` in rem). The full role
scale (display, page, section, product titles, body, supporting text, navigation, prices,
buttons, labels, helper, validation, captions) and the Uzbek and Russian rules are in
[typography](./typography.md). From the packaging, without adding typefaces: the pack's bold
uppercase labels (the four values, the "Tayyorlash usuli" title bars, the slogan strip) are set
in Onest 700 with wide tracking, and the gold rule with a diamond separates a headline from its
signature line.

## Layout

- `.container-page`: max width 88rem, side padding `--spacing-gutter` =
  `clamp(1rem, 4vw, 2.5rem)` (also available as `px-gutter`, `-mx-gutter`, `scroll-px-gutter`
  for rows that bleed to the screen edge).
- Section rhythm: `--spacing-section` `clamp(3.5rem, 2.25rem + 4.5vw, 7rem)` and
  `--spacing-section-sm` `clamp(2.5rem, 1.75rem + 3vw, 4.5rem)` (`py-section`, `pt-section-sm`…).
- Breakpoints are Tailwind's defaults (sm 40rem, md 48rem, lg 64rem, xl 80rem). The full desktop
  navigation starts at xl (1280 px); below it the header shows the menu drawer.
- Twelve-column grids for page layouts (product 7/5, catalogue toolbar, footer 4/7, checkout
  form + 24–26rem summary). Grids whose columns start at a breakpoint also declare
  `grid-cols-1`, so long content cannot widen the page.
- Horizontal rows (tea-type rail, product showcase, featured collection and journal on phones)
  scroll with snap points inside a `-mx-gutter px-gutter` bleed; their focusable items keep room
  for the focus ring.

## Shape and depth

| Token              | Value            | Used for                                               |
| ------------------ | ---------------- | ------------------------------------------------------ |
| `--radius-xs`      | 0.25rem          | Focus ring corners, highlights                         |
| `--radius-sm`      | 0.375rem         | Skeleton bars, checkboxes                              |
| `--radius-control` | 0.625rem (10 px) | Buttons, fields, selects, small cards, notices         |
| `--radius-card`    | 0.875rem (14 px) | Product and article cards, tiles, tables, popovers     |
| `--radius-panel`   | 1.25rem (20 px)  | Panels, dialogs, drawers' top sheet, large media       |
| `rounded-full`     | —                | Icon buttons, badges, chips, status pills, radios only |

Shadows are soft and green-tinted: `shadow-xs` (fields, buttons), `shadow-soft` (cards, tiles),
`shadow-lift` (hover), `shadow-overlay` (dialogs, drawers, popovers, the sticky purchase bar).
Most cards are flat with a 1 px `line` border; shadows mark what floats.

## Glass

Used only where content passes underneath: the sticky header becomes `canvas` at 90 % with a
backdrop blur once the page scrolls, and the sticky mobile purchase bar uses `surface` at 95 %.
Without `backdrop-filter`, or with `prefers-reduced-transparency: reduce`, both are opaque. Text
never sits on glass over imagery. (The earlier glass hero card and glass quick-add pill were
removed.)

## Motion

- Easing `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)` for state changes and `--ease-soft`
  `cubic-bezier(0.22, 1, 0.36, 1)` for movement. Durations: 150 ms for colour and border
  changes, 200–300 ms for movement, drawers and menus, 500 ms for image zoom and progress bars.
- Animations: `rise` (hero headline, transform only, so it never delays the largest contentful
  paint), `reveal` (sections entering the viewport; skipped for content already in view),
  `fade-in` (menu panels, sticky bar), `pop-in` (dialogs, popovers). The marquee was removed.
- Hover: tea-type tiles lift 2 px, product images scale 3 %, article art 5 %, arrows nudge
  2 px; buttons press 1 px.
- Drawers slide with the `translate` property and fade their backdrop; the top sheet (search)
  drops 12 px.
- `prefers-reduced-motion: reduce` shortens every animation and transition to near zero, shows
  revealed content immediately and disables smooth scrolling; the showcase's arrow buttons then
  jump instead of scrolling smoothly.

## Components

See the [component audit](./component-audit.md) for every primitive, its variants, states and
accessibility behaviour. In short:

| Group      | Components                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primitives | `ui/button` (Button, ButtonLink, IconButton, CountBadge), `ui/controls` (input, select, textarea, radio classes; select chevron), `ui/field` (labelled fields, checkbox, error summary), `ui/notice`, `ui/badge`, `ui/price`, `ui/sheet`, `ui/modal`, `ui/section-heading`, `ui/skeleton`, `ui/demo-notice`, `ui/reveal` |
| Layout     | announcement bar, sticky header, desktop mega menus, mobile drawer, header actions, search overlay, language switcher, footer, checkout header and footer, skip link                                                                                                                                                     |
| Catalogue  | product card and quick add, listing header with tea-type chips, filter bar, price popover, mobile filters, sort, pagination, breadcrumbs                                                                                                                                                                                 |
| Product    | gallery, purchase panel with pack-size cards and sticky bar, brewing facts, delivery facts, information disclosures                                                                                                                                                                                                      |
| Commerce   | bag drawer and page, quantity stepper, checkout with numbered sections, choice cards, order summary, order progress and details                                                                                                                                                                                          |
| Content    | page header, long-form pages, article card and body, help footer, contact and wholesale forms                                                                                                                                                                                                                            |
| Brand      | logo set (`Wordmark`, `Emblem`, `StackedLogo`, `LogoPlate`), ornaments from the pack (`BrandValues`, `Pennant`, `GoldRule`, `WavePattern`, `GreenTeaCalligraphy`, `TeaSeal`, `MoonGate`), tea-type medallions                                                                                                            |
| Admin      | shell, page header, panels, tables, status pills, filter forms, confirm dialog, editors                                                                                                                                                                                                                                  |

### Navigation pattern

Announcement bar (forest-950) → sticky header: on phones and tablets a menu button, the centred
wordmark, search, account and bag; from 1280 px the category triggers on the left with mega
menus (WAI-ARIA disclosure buttons; each panel follows its button in the DOM so Tab moves into
it; open on click, Enter, Space or a short hover; Esc closes and returns focus) and a search
field-style button on the right. The bag opens as a 30rem side drawer after adding a product.
Checkout uses a distraction-free header (back to bag, wordmark) and a footer with the policies.

## Imagery

- **Brand assets** come from the packaging print files ([packaging](./packaging.md)):
  `scripts/packaging/extract-packaging.py` renders them, `scripts/packaging/build-packaging-assets.mjs`
  cuts out the logo set (`teran-logo`, `-emblem`, `-wordmark`, and `-lockup` with the pack's line
  and rule, used for the social image), the artwork (`art/lake`, `art/terraces`, `art/sprig-1`), the pack fronts (`packs/*`) and
  the ornaments (`ornaments/*.svg`), and `scripts/generate-brand-assets.mjs` makes the favicon, app
  icons (emblem on ivory) and the default social image (1200×630) from the logo set. PNG and WebP
  copies are written; the web app imports them through `next/image`, which serves modern formats.
- **Ornaments** (`components/brand/ornaments.tsx`): the pack's four ringed icons and their labels
  (`BrandValues`), 绿茶 with the 茶叶 seal, the seal alone, the "PREMIUM CHINESE TEA" ribbon
  (`Pennant`), the gold rule with a diamond (`GoldRule`), seigaiha waves (`WavePattern`) and the
  round view onto the lake (`MoonGate`). All decorative; the text beside them is real text.
- **Product photos** are uploaded in the admin and served as WebP renditions with `srcset`
  ([ADR-009](../architecture/decisions.md)). XC2025, G8810, 8830 and 8009 have pack shots made
  from their print files (front and back); the other demonstration products keep pack shots and
  leaf studies drawn in code ([ADR-014](../architecture/decisions.md)).
- **Illustrations** (ten tea-type medallions) are inline SVG components, also used as the
  placeholder when a product has no photo. Medallions are always shown whole (never cropped by a
  container edge); large decorative rings, the hero's tea sprigs and the emblem watermark are the
  only art that bleeds off a panel.
- **Alternative text:** product images use the product name (plus "demonstration image" in demo
  mode); decorative art is hidden from assistive technology.

### Art direction for future photography

The layout is ready for real photography; until it exists, the code-drawn art fills every slot.
To keep the store consistent when photos arrive:

- **Pack shots:** one style for every product — the pack facing the camera, centred on a
  seamless ivory background (`#f6f0e3`), soft shadow below, square crop, at least 2000 px on
  the long side (the admin creates the smaller sizes). The product card and the product page
  show the image on `surface-muted`, so a matching background blends in.
- **Second images:** the dry leaf on a plain plate or a cup of the brewed tea, same light.
- **Hero:** the lake from the front of the pack, with the packs standing on its shore. A future
  photograph should keep calm space in the upper middle for the centred headline; the mist keeps
  the text readable, but busy detail behind the words should be avoided.
- **About and journal:** only real places, people and processes, with permission.

### Missing assets

| Asset                                            | Used in                                  | Status                                                                                                  |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Product photographs (pack shots, leaf or cup)    | Product cards, product page, search, bag | Four products have pack shots made from the print files; photographs are still missing for all products |
| Vector logo (SVG or PDF)                         | Header, footer, favicon, social image    | The print files hold it, but its gold parts are gradients; it is used as a 1200 dpi cut-out             |
| Official brand colour values                     | Tokens                                   | Measured on the print files with their ICC profile; Pantone or CMYK references from TERAN welcome       |
| Rights to the packaging illustrations            | Hero, collection panel, philosophy       | To be confirmed by TERAN ([packaging](./packaging.md#questions-for-teran))                              |
| About page imagery (history, production, people) | `/about`                                 | Missing; a highlighted placeholder explains what will appear                                            |
| Journal article images                           | Article cards and pages                  | Missing; tea-type medallions stand in                                                                   |

Product facts and permissions are tracked in
[business information required](../business-information-required.md).

## Accessibility patterns

- Skip link to `#main` in the store, checkout and admin; landmarks with labelled navigation.
- Dialogs (bag, search, menu, filters, confirmations) use the native `<dialog>` with
  `showModal()`: focus is contained, Esc closes, focus returns to the opener, the page behind
  does not scroll, and dialogs always align text to the reading direction.
- Buttons that are busy stay focusable (`aria-disabled` + `aria-busy`, clicks ignored), so a
  keyboard user does not lose focus to the page while an action runs; the same applies to the
  quantity stepper at its limits.
- Forms: visible labels, "(optional)" on optional fields, hints and errors linked with
  `aria-describedby`, `aria-invalid`, an error summary with `role="alert"`, focus moved to the
  first invalid field, and an error disappears as soon as its field is corrected (checkout).
- Live regions announce search results, result counts, add-to-bag status and order totals.
- Choices use native radios (pack sizes, brewing guide, delivery, payment, sort) and native
  checkboxes, styled but never replaced.
- The product card is one stretched link (one tab stop) whose focus ring outlines the whole card.
- Charts in the admin are hidden from assistive technology and duplicated as a visually hidden
  table.
- Verified by the end-to-end suite (axe, WCAG 2.2 A/AA rules, on 22 storefront pages, checkout
  with errors, admin and phone dialogs) and by keyboard scripts listed in the
  [redesign checklist](./redesign-checklist.md).

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
