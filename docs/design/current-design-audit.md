# Current design audit

Audit of the TERAN storefront and admin as built before the redesign (commit `cec1e72`,
2026-10-14). Method: code review of `apps/web` plus 97 screenshots of the production build: 87
desktop (1440 px) and phone (390 px) captures covering every public route, the admin area and the
interactive states (mega menu, mobile drawer, search, filters, bag drawer, checkout with errors,
order confirmation, admin dialog), and 10 tablet captures at 768 px and 1024 px. A representative
subset is committed in [`screenshots/before/`](./screenshots/before/), next to the same states
after the redesign in [`screenshots/after/`](./screenshots/after/).

Severity: **Critical** blocks a task · **High** visibly broken or seriously degrades a key journey ·
**Medium** inconsistent or weak, noticeable to most visitors · **Low** polish.

## 1. Visual problems

| #   | Severity | Finding                                                                                                                                                                          | Where                                       | User impact                                                                       |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| V1  | High     | The bag drawer fills the whole viewport on desktop: the dialog's base `max-w-none` overrides the panel's `max-w-[28rem]` because classes are joined without conflict resolution. | `components/ui/sheet.tsx` (right side)      | Adding to the bag hides the page behind an empty 1440 px panel; looks broken.     |
| V2  | High     | Admin dialogs opened from table cells inherit `text-align: right` (a native `<dialog>` inherits from its DOM parent): title, labels and hints are right-aligned.                 | Inventory "Adjust", order and image dialogs | Forms are hard to read; looks broken.                                             |
| V3  | High     | The mobile catalogue shows no product above the fold: tall beige banner + demo notice + two-row toolbar push the first card to ~660 px.                                          | `/catalog`, categories, collections         | Shoppers must scroll before seeing any tea; DAVIDsTEA shows products at ~460 px.  |
| V4  | Medium   | Too many beige-on-ivory surfaces (listing banner, notice, cards, panels, image backgrounds) with similar values; little separation between surface levels.                       | Site-wide                                   | Flat, low-contrast hierarchy; the eye has no anchor.                              |
| V5  | Medium   | Hero on mobile and tablet: a glass card almost the size of its rounded panel creates a double frame and hides the illustration; the two buttons stack at different widths.       | Home                                        | Cramped first impression; the brand imagery is lost.                              |
| V6  | Medium   | Clipped illustrations: the leaf disc in the listing banner and the mega-menu feature card are cut by the container edge.                                                         | Listing header, mega menu                   | Looks unfinished.                                                                 |
| V7  | Medium   | Demonstration notices use the same loud gold box everywhere, including between the purchase button and delivery facts.                                                           | Listings, product, checkout                 | Competes with the primary action.                                                 |
| V8  | Medium   | Shape language: 99 `rounded-full` controls, pill inputs and even pill textareas, 20–32 px panels; radius tokens referenced through 80 arbitrary `rounded-[var(--…)]` classes.    | Site-wide                                   | Reads as a friendly app rather than a premium heritage brand; inconsistent edges. |
| V9  | Low      | A decorative marquee ribbon repeats the tea types shown again two sections later.                                                                                                | Home                                        | Adds motion without new information.                                              |

## 2. Typography problems

| #   | Severity | Finding                                                                                                                                                                                          | Impact                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| T1  | High     | The interface font (Manrope) has no glyphs for **ʻ** (U+02BB) and **ʼ** (U+02BC). Every _oʻ_, _gʻ_, _maʼlumot_ in body text, navigation, buttons and forms falls back to a system font mid-word. | Uzbek, the default language, renders with mixed typefaces. |
| T2  | High     | Cormorant Garamond defaults to old-style figures: dashboard KPIs ("1" reads as "I", "0" as "o"), SKUs in dialog titles ("TRN-…-100" reads "ioo"), weights in serif titles.                       | Numbers are hard to read in data contexts.                 |
| T3  | Medium   | Cormorant's small x-height and hairline strokes hold up only at hero sizes; at 20–28 px (product cards, panels, sheet titles, admin headings) it looks fragile and small.                        | Weak hierarchy below the hero.                             |
| T4  | Medium   | Serif used for interface titles (product card names, drawer titles, KPI values) and sans for everything else, without rules.                                                                     | Inconsistent voice; scanning product names is slower.      |
| T5  | Medium   | No type tokens beyond three display sizes and an eyebrow; sizes, weights and line heights are set ad hoc per component (e.g. `text-[1.35rem]`, `text-[0.92rem]`).                                | Inconsistent rhythm between pages.                         |

## 3. Component inconsistencies

| #   | Severity | Finding                                                                                                                                                                   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Medium   | Only 24 of 153 component files use the shared `Button`; about 40 `<button>` elements are styled by hand with different heights (36–52 px), paddings and hover treatments. |
| C2  | Medium   | 24 raw `<input>` elements outside the field components (search, filters, admin filters, quantity) with their own borders, radii and focus styles.                         |
| C3  | Medium   | The sort control shows the browser's native arrow while every other select uses a custom chevron.                                                                         |
| C4  | Medium   | Price range filter: two bare number inputs with prices as placeholders and an inline "Apply" button squeezed into the chip row.                                           |
| C5  | Low      | Badges, pills and status chips use five different paddings and tracking values.                                                                                           |
| C6  | Low      | Section headers (eyebrow + title + action) are re-implemented in each home section.                                                                                       |

## 4. Responsive issues

| #   | Severity | Width      | Finding                                                                                       |
| --- | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| R1  | High     | 1024 px    | Desktop navigation wraps "For business" and "About TERAN" onto two lines and crowds the logo. |
| R2  | High     | 390 px     | Catalogue products below the fold (V3).                                                       |
| R3  | Medium   | 390 px     | Toolbar: "Filters" and count on one row, a full-width native select on the next.              |
| R4  | Medium   | 390–768 px | Hero double frame (V5).                                                                       |
| R5  | Low      | 390 px     | Product page: price and purchase controls start below the fold; the sticky bar compensates.   |

No page scrolls sideways at 360–1440 px (verified by the layout scan added in the previous phase).

## 5. Accessibility issues

Automated checks (axe-core, WCAG 2.0–2.2 A/AA) report no violations and Lighthouse scores 100, but
manual review found:

| #   | Severity | Finding                                                                                                       |
| --- | -------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | High     | Mixed-font rendering of Uzbek letters (T1) — legibility for the primary audience.                             |
| A2  | Medium   | Old-style figures in numeric data (T2).                                                                       |
| A3  | Medium   | Right-aligned form labels in admin dialogs (V2) break the expected reading flow.                              |
| A4  | Low      | Language switcher in the announcement bar is 12 px text; touch targets are adequate but the labels are small. |

Preserved strengths: skip links, native `<dialog>` focus handling, labelled forms with error
summaries, live regions, visible focus rings, reduced-motion and reduced-transparency support.

## 6. Differences from the DAVIDsTEA reference

See [competitive benchmark](./competitive-benchmark.md) for the full matrix. In short:
DAVIDsTEA has a stronger, more consistent type voice, denser product discovery on mobile, a
search overlay with suggestions and products side by side, a full-height filter drawer with a
sticky results button, consistent product photography, and a distraction-free checkout. TERAN is
already better on accessibility (real disclosure buttons, native dialogs, honest copy), on
performance, and in trilingual support.

## 7. High-impact redesign opportunities

1. A real type system: EB Garamond for display, Onest for interface (full Uzbek and Cyrillic
   coverage, lining and tabular figures), with tokens for every role.
2. Semantic colour tokens and clearer surface levels (canvas, surface, muted, inverse).
3. One control language: 10 px radius for buttons and fields, pills only for chips and badges,
   44–48 px heights.
4. Rebuilt shared components (button, fields, select, checkbox, radio, dialog, drawer, badge,
   notice, product card) and migration of hand-styled controls.
5. Catalogue: compact header and toolbar so products appear above the fold; price filter in a
   popover; visible, removable active filters.
6. Header: responsive navigation without wrapping, refined mega menu, full-width search overlay.
7. Homepage: an art-directed composition rather than stacked panels.
8. A focused checkout layout with fewer exits.
9. Admin: sans-serif data, consistent tables, fixed dialog alignment.

## 8. Components to preserve

Native-dialog focus management, form submission and validation flow (`useFormSubmission`, shared
Zod contracts, translated messages), money and date formatting, cart store and purchase logic,
URL-driven filters and pagination, streaming/cache structure, admin data flows, skip links and
live regions, reduced-motion handling.

## 9. Components to redesign

Button and icon button; text, textarea, select, checkbox, radio fields; sheet and confirm dialog;
badges and status pills; notices; product card; listing header and filter toolbar; mobile filters;
sort; pagination; purchase panel and gallery; bag drawer, cart lines and quantity stepper;
checkout sections, choice cards and order summary; site header, mega menu, mobile menu, search
dialog, announcement bar, footer; hero and home sections; page headers and long-form pages;
account forms; admin shell, KPI cards, tables, filters and editors.

## 10. Limitations

- The TERAN concept screenshot from the original brief is not available in this session; its
  identity signals are taken from the earlier written record ([reference audit §7](./reference-audit.md)).
  The supplied logo is in the repository and was reviewed directly.
- All product and hero imagery is code-drawn demonstration art; no photography exists yet.
- Before screenshots were taken on the production build with the seeded demonstration data and
  `prefers-reduced-motion: reduce` (stable captures).
