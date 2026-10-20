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

| Foreground                                            | Background                               | Ratio                     |
| ----------------------------------------------------- | ---------------------------------------- | ------------------------- |
| fg (ink-900)                                          | canvas / surface                         | 15.66 / 16.35             |
| fg-muted (ink-700)                                    | canvas / surface-muted / surface-sunken  | 9.94 / 9.13 / 8.13        |
| fg-subtle (ink-500)                                   | canvas / surface / surface-muted         | 5.70 / 5.95 / 5.24        |
| accent-fg (gold-700)                                  | canvas / surface / surface-muted         | 5.70 / 5.95 / 5.24        |
| brand (forest-900)                                    | canvas                                   | 11.87                     |
| fg-inverse (ivory-50)                                 | surface-inverse / surface-inverse-deep   | 11.87 / 14.78             |
| ivory-50 (title bars, ribbon, slogan strip)           | forest-700                               | 8.77                      |
| accent-on-inverse (gold-300)                          | surface-inverse / surface-inverse-deep   | 8.08 / 10.06              |
| ivory-100 at 85 % / 70 % (footer links / legal)       | surface-inverse-deep                     | 10.10 / 7.32              |
| forest-950 (accent button text)                       | accent / accent-hover                    | 6.50 / 8.22               |
| success                                               | success-soft / surface                   | 6.40 / 7.59               |
| warning                                               | warning-soft                             | 6.88                      |
| danger                                                | danger-soft / surface                    | 5.77 / 7.09               |
| info                                                  | info-soft                                | 8.01                      |
| forest-900 (filter chips)                             | brand-soft                               | 10.85                     |
| Hero words (lightest pixel behind any line)           | the night garden, its jade glow and mist | ≥ 6.57 (headline ≥ 10.28) |
| line-strong (text-field and select borders, non-text) | surface / canvas                         | 3.67 / 3.52               |
| focus ring (forest-700, non-text)                     | canvas                                   | 8.77                      |
| focus ring on dark (gold-300, non-text)               | surface-inverse                          | 8.08                      |

Rules that keep it that way:

- Gold lighter than 700 is never text on light surfaces (gold-500 on ivory is 2.3:1).
- Text over artwork or atmosphere is measured against the least favourable pixel behind each
  line (the lightest under light text), at several moments while mist and light move; the hero is
  checked at 1280 and 390 px in all three languages.
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

Calm and unhurried, like steam over a cup: small distances, no bounce, and nothing that moves
while someone is reading, paying or filling in a form.

- Easing `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)` for state changes, `--ease-soft`
  `cubic-bezier(0.22, 1, 0.36, 1)` for movement and `--ease-ambient`
  `cubic-bezier(0.37, 0, 0.63, 1)` for slow background motion. Durations: 150 ms for colour and
  border changes, 200–300 ms for movement, drawers and menus, 500 ms for image zoom and progress
  bars, 600–900 ms for entrances, 24–31 s per half cycle for background leaves and 60–90 s for a
  return trip of background mist.
- Animations: `rise` (the hero's words, as one group; transform only, so they are readable from
  the first frame and never delay the largest contentful paint), `reveal` (sections entering the viewport; skipped for
  content already in view), `fade-in` (menu panels), `pop-in` (dialogs, popovers, confirmations),
  `draw` (gold rules), `slide-up` (the sticky purchase bar), `badge-pop` (the bag count
  going up), `disclose` (opened `<details data-disclose>`), `glow-out` (the highlight on a bag
  line just added). The marquee was removed.
- Entrances: the hero's words arrive together, the stage's products stream in after them; cards,
  articles and the three brand principles in a revealed section rise one after another
  (`data-stagger` on the list, `--i` on each item, at most six steps).
- Hover: tea-type tiles lift 2 px, product images scale 3 %, article art 5 %, arrows nudge
  2 px; buttons press 1 px.
- Drawers slide with the `translate` property and fade their backdrop; the top sheet (search)
  drops 12 px. The product gallery is a row of slides with scroll snapping: a swipe on phones,
  smooth scrolling from the arrows, thumbnails and ←/→.
- Only `transform`, the individual `translate`/`rotate`/`scale` properties and `opacity` are
  animated; progress bars grow with `scaleX`, not `width`.
- `prefers-reduced-motion: reduce` shortens every animation and transition to near zero (and
  drops their delays), shows revealed content immediately and disables smooth scrolling; the
  gallery and the showcase's arrow buttons then jump instead of scrolling smoothly. The botanical
  atmosphere (mist, light, branches) stays at rest (it also stays still below 1024 px).

### Botanical atmosphere

A tea garden at dawn behind a few storefront sections (`<BotanicalLayer scene>` in
`components/brand/botanical.tsx`, styles in `styles/botanical.css`). Every shape and texture is an
original drawing made in code for the website by `scripts/botanical/generate-botanical.mjs`
(writes `public/brand/botanical/`), not packaging artwork. Each scene is built in depth, back to
front:

- **Ridges** (hero only): far and near ranges of karst peaks along the lower half of the night
  garden, faint behind the words and the stage. `sage-500` deepened with `forest-800`, darker at
  the crests, dissolving into mist at the foot; the far layer paler and softer.
- **Mist**: long irregular bands from two textures of soft fractal noise (`mist-band.webp`,
  `mist-wisps.webp`, 4–6 KB) that repeat seamlessly from side to side. Each band drifts endlessly
  at its own speed and direction (one texture tile in 53–84 s) and thins and thickens on its own
  cycle (23–61 s); the farthest only sways over 47 s. `ivory-50` over the painted hero and on dark
  green, a faint `sage-300` veil on white.
- **Light**: warm radial glows (`gold-400`, a little red-gold `amber` in the brewing section, a
  `sage-200` wash on editorial headers), shafts of pale morning sun through the hero mist, and a
  halo just outside the moon gate's rim. The strength is part of the gradient's colour; the rays
  are a ready-made drawing (`rays.svg`). Over the painted hero the rays and one glow brighten,
  fade and wander slowly (31–59 s). On plain cream, white and dark green the glows stay still,
  and from 1024 px a soft texture (`light.webp`) varies their strength a little: a smooth
  gradient this faint shows rings on an 8-bit screen, more so when the compositor animates it.
- **Leaves**: tea branches with alternate leaves ending in "one bud, two leaves", a branch that
  follows the moon gate's circle, a sprig, and the branch out of focus (`branch-soft.webp`): the
  nearest foliage on the hero stage, and soft shadows of branches on cream and white. Branches
  sway 1–2.4° about their cut ends (9–27 s). On the hero stage, from 1024 px and with motion
  allowed, a few single leaves drift down at different depths, never over the product: two small
  pale ones behind it and one near leaf at each side in front, each falling for 27–41 s on a
  swaying path, tilting with each sway, out of step. Each fall is one animation of `transform`:
  short alternating animations would wake the main thread every time they turn.

| Scene        | Where                                              | Wide screens (from 1024 px)                                                                                                                    | Phones and tablets                                       |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `heroNight`  | Home hero, behind the words and the stage          | Far and near ridges low in the garden, mist bands at their foot and wisps above, the sun's shafts from the top right corner (breathing slowly) | The far ridges only (one small file on the first screen) |
| `gate`       | Inside the moon gate, over the lake painting       | Bands of mist drifting slowly across the lake                                                                                                  | None                                                     |
| `stageBack`  | Hero stage, behind the product                     | Mist at the foot of the gate spreading into the garden; two small pale leaves drifting down                                                    | None                                                     |
| `stageFront` | Hero stage, in front of the product, at the sides  | A near leaf drifting down on each side; a branch out of focus reaching in from the top right                                                   | None                                                     |
| `story`      | Behind the moon gate (home) and the emblem (About) | Warm light and a halo behind the ring, ground mist drifting beneath it, a branch following the circle, a sprig at the upper right              | Light, halo, the branch and the sprig, still (no mist)   |
| `storyEdges` | Corners of the home philosophy section             | Soft shadows of branches top left and bottom right                                                                                             | None                                                     |
| `brewing`    | Home brewing section                               | Amber light behind the heading, a branch's shadow falling across the top left, a branch at the lower left, a sprig at the upper right          | Light and a still sprig                                  |
| `gallery`    | The gallery's dark band (home) and `/media` header | Warm light behind the heading, a faint bank of mist far below the pictures, a branch out of focus beyond the right edge                        | None                                                     |
| `editorial`  | About and Journal headers                          | Warm light, a cream-to-sage wash from the lower left, a branch's shadow at the right edge, a sprig at the lower left                           | Light, the wash and one still leaf                       |
| `business`   | Inside the dark partnership band                   | Warm light in the upper corner, fog drifting low over the band, a pale branch out of focus                                                     | Light only                                               |
| `listing`    | Catalogue, category and collection headers         | Still: a little warm light and a branch beside the title                                                                                       | None                                                     |
| `product`    | Product page, behind the gallery                   | Still: warm light behind the gallery, a branch's soft shadow and a sprig beneath it                                                            | None                                                     |

Motion: only `translate`, `rotate` and `opacity` animate, and each element animates at most one
transform property (static turns and mirroring sit on a parent), so the compositor runs every
animation without the main thread. Every moving piece is a single layer: it carries its own
opacity (no parent group to blend again each frame), still light is drawn before the mist so it
merges with the background, and the scene's one-off fade-in fills only backwards. Durations are
all different, so nothing moves in step. Below 1024 px and with reduced motion nothing moves; with
reduced transparency mist, light and shadows are hidden; the still composition is complete on its
own. Pieces hidden at a breakpoint also drop their shapes and textures, so phones fetch at most
three small files per page (the far ranges, the moon gate's branch, a sprig or leaf).

Rules: decoration only (`aria-hidden`, `pointer-events: none`), below every heading, price, photo
and control, at the edges and in empty space, never behind a product grid or filters; layers that
reach past a section edge clip sideways (no horizontal scrolling) and fade out vertically (no hard
lines). The bag, checkout, accounts, sign-in, contact and legal pages and the administration have
none of it. To remove it, delete the `@import './botanical.css'` line in `globals.css`, the
`<BotanicalLayer>` calls and `public/brand/botanical/`.

## Refinement of 2026-10-20

A design critique of the live storefront (Impeccable, 22/40) led to targeted changes that keep its
look: the teal frame, gold Oswald headlines, films, pills and rounded banners are unchanged.

- **The five teas told apart** ([ADR-049](../architecture/decisions.md)): each card's second
  picture (a tea's dry leaf) stands as a round swatch on every device, ringed in the pack's
  colour. Pack colours mark a tea only (swatch ring, the premium band's codes), never a surface.
- **Order carries the tea** to the contact page, which names it above a prefilled form; the
  product page gets the card's single Order pill while prices are hidden.
- **Type scale:** the first view's headline is the page's largest, fitted to its longest line
  (`--hero-fit`, up to 6rem in a column of min(56rem, 62vw)); campaign banners stop at 5rem,
  bands at 4.5rem.
- **Modules show only with enough content:** category shortcuts from three stocked categories,
  the collage from three tiles (a family with a single range is shown by that range's tile), and
  a row of exactly five products shows all five; a featured tab that would repeat the newest one
  is left out. They return by themselves as the range grows.
- **Motion:** one scroll-linked moment, home product rows rising into place as they scroll in
  (CSS scroll-driven animation; visible without it, off with reduced motion). The ribbons hold
  still under the pointer, a pressing finger and the footer's switch. The offer card stays off
  the home page and, on phones, above the floating contact button.
- **Copy kept, repetition removed:** the story banner answers its heading with the brand's own
  first sentence; the values band reads "What TERAN stands for" instead of repeating the tagline.

## Experience upgrade of 2026-10-20

The client found the refined storefront still too ordinary; the home page became one narrative
and business its centre ([ADR-050](../architecture/decisions.md)), with the identity unchanged.

- **Rhythm of surfaces:** film (first view) · jade ribbon · white with a pack-tinted stage · light
  grey (the range) · sky (cold drinks) · deep teal `teal-ink` (business) · lavender (story) ·
  white rows · black and gold (gift sets) · white (journal) · deep teal (the request again) · aqua
  (slogan) · teal footer. No two neighbouring sections share a surface.
- **Type:** Fraunces for section headings (up to 4.25rem), Oswald capitals for labels, steps and
  the business index (2.5rem), Nunito for text (`text-pretty` on paragraphs, so no word is left
  alone on a line); the first view keeps the largest headline.
- **First view:** one filled button, "Shop teas" (to the five teas); the black strip above is the
  business door ("TERAN for business", the kinds of business, "Request an offer"); the header's
  account links are plain words.
- **Business:** "TERAN for business" in Fraunces; rows of kinds of business (number, name, the
  for-business page's line, arrow disc) beside a framed picture that wipes to the row pointed at;
  phones show a small picture in each row; every row opens the request form with its kind chosen.
  Under it the proof (five pouches, one pack size, straight from the importer) and "How it works"
  in four steps. Focus rings in the dark sections are gold. Arrows point on, not out (→, not ↗):
  every link is TERAN's own page.
- **Story:** a sticky framed window (below the header, as tall as the view allows) beside four
  steps of half a view each; each step crossing the middle of the view wipes its picture up over
  the last. Pictures are the slots' upright crops, and their `sizes` follow the crop (a landscape
  picture in an upright frame is drawn wider than the frame). Phones show each step's picture above
  its words. Only the shown step's film plays.
- **Product families:** mark, ink, field, swatch ring and hover light per family
  (`components/catalog/product-family.ts`); tea keeps its film and leaves.
- **Motion vocabulary:** `--ease-out-expo` `cubic-bezier(0.16, 1, 0.3, 1)` for arrivals and
  wipes, `--ease-scene` for scrubbed scenes; arrivals 800–1100 ms (`arrive-line`, `arrive-rise`,
  `arrive-pack`, `arrive-settle`, staggered by `--i`), wipes 1000 ms (`.wipe-layer`), the card
  light 1200 ms (`.card-sheen`). Scroll-scrubbed depth (GSAP + ScrollTrigger, loaded on the first
  scroll, never with reduced motion) only in the first view and the signature stage. Nothing pins; reduced motion stills
  everything.

## The brewing language (round 4, 2026-10-21)

The site's motion and page patterns since [ADR-051](../architecture/decisions.md); where this
section and the ones above disagree, this one holds.

- **Verbs, each where it is literally true:** STEEP (a colour spreading from its source: the
  stage, listing headers, About's band), POUR (a level rising: the stage's cup, the story's
  scenes, Tea 101's cups), UNFURL (a leaf opening: the stage, Tea 101, every disclosure), LIGHT (a
  pass over glass or gift), CLEAR (a name coming into focus). Registered properties drive them:
  `--steep` (0→140 %), `--level` (0→116 %), `--from`/`--to` (the gauge's range).
- **Scroll-linked, never scroll-taking:** `.scroll-steep`, `.kind-deepen`, `.scroll-unfurl` and
  `.cups-pour` follow a view timeline; without support or with reduced motion the result simply
  stands. A band that clips uses `overflow: clip` (`hidden` would become its own timeline's
  scroller). Product rows and range tiles no longer rise as they scroll in.
- **Still:** forms, the account, reading (articles, help, policies) and the catalogue's grids.
- **Easing:** `--ease-steep` `cubic-bezier(0.45, 0.05, 0.25, 1)` for STEEP (1800 ms), `--ease-scene`
  for POUR (1100 ms), `--ease-out-expo` for UNFURL and arrivals.
- **Patterns:** `ui/state-message.tsx` (nothing to show), `content/support-row.tsx` (write, call,
  Telegram), `content/further-links.tsx` (where to read on), `content/disclosure.tsx` (a question
  and its answer), `content/article-card.tsx` and `article-cover.tsx` (the journal),
  `catalog/family-shelves.tsx` and `catalog-grid.ts` (shelves; never one card alone in a row),
  `brand/tea-rulers.tsx` (five teas, one ruler), `brand/brewing-gauge.tsx`.
- **Reading:** text at about 70 characters a line (38–40 rem at 17–18 px), Fraunces headings in
  sentence case, teal list marks; eyebrows in Oswald capitals in `forest-900` on white or
  `forest-800` on `ivory-100` (4.5:1).
- **Colour:** `--color-paper` `#f7f4ee` is the warm paper the pouches stand on. Tea 101's bands are
  each kind's cup colour at 16 % on paper; their drawings use the same colour deepened (62 % with
  black), and their quietest grey steps up to `ink-700`.

## Components

See the [component audit](./component-audit.md) for every primitive, its variants, states and
accessibility behaviour. In short:

| Group      | Components                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primitives | `ui/button` (Button, ButtonLink, IconButton, CountBadge), `ui/controls` (input, select, textarea, radio classes; select chevron), `ui/field` (labelled fields, checkbox, error summary), `ui/notice`, `ui/badge`, `ui/price`, `ui/sheet`, `ui/modal`, `ui/section-heading`, `ui/skeleton`, `ui/demo-notice`, `ui/reveal` |
| Layout     | announcement bar, sticky header, desktop mega menus, mobile drawer, header actions, search overlay, language switcher, footer, checkout header and footer, skip link                                                                                                                                                     |
| Catalogue  | product card and quick add, category cards and category art, listing header with category chips, filter bar, price popover, mobile filters, sort, pagination, breadcrumbs                                                                                                                                                |
| Product    | gallery, purchase panel with pack-size cards and sticky bar, brewing facts, delivery facts, information disclosures                                                                                                                                                                                                      |
| Commerce   | bag drawer and page, quantity stepper, checkout with numbered sections, choice cards, order summary, order progress and details                                                                                                                                                                                          |
| Content    | page header, long-form pages, article card and body, help footer, contact and wholesale forms                                                                                                                                                                                                                            |
| Brand      | logo set (`Wordmark`, `Emblem`), the pack's value icons (`BrandValues`, `ValueIcon`, `ValueMark`), tea-type medallions                                                                                                                                                                                                   |
| Admin      | shell with grouped menu and work counts (drawer on phones), page header, panels, tables that become cards below 768 px, status tabs, status pills, filter forms that apply on change, confirm dialog, top-of-screen confirmation, sticky save bar, editors                                                               |

### Navigation pattern

Announcement bar (forest-950) → sticky header: on phones and tablets the menu button and search
on the left, the wordmark in the centre, account and bag on the right (two 44 px buttons on each
side, so the wordmark is really centred; below 360 px the account is reached from the drawer and
the wordmark is at most 12 px off centre); from 1280 px "Catalogue", "Collections", "For
business" and "About TERAN" on the left and a search field-style button on the right. Both search
buttons open the same overlay. The bag opens as a 30rem side drawer after adding a product.
Checkout uses a distraction-free header (back to bag, wordmark) and a footer with the policies.

Every menu is built from one category tree (`lib/navigation.ts`, from `GET /catalog/categories`
and `/catalog/collections`): the same order, names, counts, pictures and parent/child structure on
desktop, in the drawer and on the home page's cards. No category is named in code.

- **Desktop panels** open full width under the header, aligned to the page grid (WAI-ARIA
  disclosure buttons; click, Enter/Space or a short hover; Esc closes and returns focus; a click
  outside or on a link closes). They fade and slide 6 px in 200 ms and the page dims behind them
  (`forest-950` at 25 %); a panel taller than the window scrolls inside itself. Like the drawer's,
  their contents are rendered the first time they open (no page carries the menus in its HTML)
  and kept afterwards.
  - _Catalogue_: the top-level categories on the left (illustration, name, count; the active one
    marked with a gold bar). Pointing at or focusing one shows, in the middle, its count, name,
    description, its subcategories in two columns and a "Barchasi: …" link, and on the right its
    category card. Each category's details follow its row in the document, so Tab walks row → its
    subcategories → next row. Long names wrap to two lines; a long subcategory list scrolls.
  - _Collections_: collection tiles in the category card style, at most four across, filling the
    row.
  - _About TERAN_: "The world of TERAN" and "Help" with a line about each page, and a dark card
    with the brand tagline.
- **Drawer** (below 1280 px, left, native dialog): the catalogue first — each top-level category
  with subcategories is a disclosure button that opens to "Barchasi: …" and its subcategories with
  counts (the first starts open while there are at most three top-level categories), the others
  are links — then "All products", collections as tiles, "The world of TERAN", "Help" and the
  account; the account link and language switch stay in the footer. Rows are at least 48 px
  tall; long names wrap; the close button stays in the header row.

### Home hero

One view, no rotation (ADR-037): TERAN's words on the left over the film of `home.hero.1` (its
picture, or the lake painted on the packs, without one), and the five pouches standing on the
view's lower edge, XC2025 in the middle, the outer ones lower and turned outwards
(`components/home/hero.tsx`, `hero-stage.tsx`).

- **Words:** the descriptor, the pack's tagline as the headline (one sentence per line, each line
  rising out of its own mask), the description, then "Shop teas" (the view's one button, to the
  five teas). The headline is fitted to its longest line (`--hero-fit`); the way in for businesses
  is the black strip above the view.
- **Depth:** while the view scrolls away the film moves slower than the page, the words faster,
  and the pouches rise and part (GSAP ScrollTrigger, scrubbed; nothing pinned). The view is
  clipped at its sides only, so the pouches never widen the page.
- **Arrival:** the film settles from a slight zoom, the lines rise, the words and pouches follow
  one after another (CSS, from the first paint; still with reduced motion).
- **Phones:** the taller crop and film under 900 px, the words over its lower half, the pouches
  smaller; the e2e tests keep "Deep Taste." and "Shop teas" in the first view.

### Category cards

The home page's "Turkum boʻyicha" shows the categories shoppers browse (subcategories, and
top-level categories without any; at most eight, then "All products") as deep green cards
(`components/home/category-cards.tsx`, art in `components/catalog/category-art.tsx` and
`styles/category-art.css`). Each card holds a moon window with the category's picture from its
data (`CategoryDto.image`: a product standing in front of the window when it has a cut-out, a
photograph inside it otherwise, the category's illustration — the neutral medallion when none is
set — without either), warm light behind it, and two botanical silhouettes at different depths:
a soft, out-of-focus branch shadow and a crisp branch or sprig in forest green. Four compositions
alternate so neighbouring cards never move alike.

From 1024 px, with motion allowed, each silhouette drifts on its own 40–70 s cycle (one
`transform` animation per layer); on hover or keyboard focus the light warms, the window rises
4 px, the near silhouette leans further than the far one and a gold hairline draws in. Touch
screens need no hover: the whole card is the link. Rows hold at most four cards and are balanced
(6 → 3 + 3, 7 → 4 + 3); tablets show two per row; phones scroll the cards sideways. The same art
appears in the desktop catalogue panel and on the collection tiles.

### Media: photographs ("Rasmlar") and films ("Videolar") kept apart

Photographs and short films managed in Admin → Gallery, in two separate lists with their own
"new" buttons and order (`MediaItem`: kind fixed when created, title, caption or description and
image description in three languages, status, shown on the home page or not; a photo, or a film's
poster, file, running time read from the file and optional WebVTT subtitles).

- **Home page**: "TERAN olamidan lavhalar" on a dark band (`forest-950`, the quiet `gallery`
  botanical scene) with two groups, each with its own heading and "all" link: **Rasmlar** — an
  editorial spread of the photographs chosen for the home page (a wide feature with its caption
  over the picture, a tall picture beside it, then a full row with captions beneath; phones scroll
  the rest sideways) — and **Videolar** — up to three film posters in a 16:9 grid with the running
  time. While no film exists, the films group says plainly that films are coming; no footage is
  invented.
- **`/media`**: an overview with the same two groups; **`/media/photos`** and **`/media/videos`**:
  every published item of one kind, paginated. Tabs ("Hammasi · Rasmlar · Videolar", with counts)
  link the three pages; old `/media?kind=…` links redirect permanently. Photographs keep their
  proportions in rows of equal height; films are posters with play marks.
- **In articles**: an article can show photographs and films chosen from the gallery (reused,
  never uploaded twice; up to 12, in the editor's order). They appear below the text on the same
  dark band, photographs and films in separate groups, and only while they are published.
- **Viewer**: full screen (native modal dialog: focus moves in and returns to the tile; Esc
  closes; ←/→, Home/End, buttons and a swipe move), a counter, the caption, and a strip of
  thumbnails; the neighbours load ahead. Films show their poster and start only when the visitor
  presses play, with the browser's controls and subtitles when they exist; moving on stops them.
- Pictures are lazy WebP renditions with `srcset`; hover draws them 3.5 % closer over 1.4 s and
  frames the smaller ones with a gold hairline.
- The demonstration items are the packaging artwork, titled as such ("Qadoq rasmi: …"); they are
  never presented as photographs of real places or processes.

## Imagery

- **Brand assets** come from the packaging print files ([packaging](./packaging.md)):
  `scripts/packaging/extract-packaging.py` renders them, `scripts/packaging/build-packaging-assets.mjs`
  cuts out the logo set (`teran-logo`, `-emblem`, `-wordmark`, and `-lockup` with the pack's line
  and rule, used for the social image), the artwork (`art/lake`, `art/terraces`, `art/sprig-1`), the pack fronts (`packs/*`) and
  the ornaments (`ornaments/*.svg`), and `scripts/generate-brand-assets.mjs` makes the favicon, app
  icons (since 2026-10-19 round, at the owner's request: the emblem glowing on a deep green disc in
  a thin gold ring, transparent around it; the home-screen icon fills its square) and the default
  social image (1200×630) from the logo set. The logo set
  is PNG (the artwork WebP); the web app imports them through `next/image`, which serves modern
  formats.
- **Ornaments** (`components/brand/ornaments.tsx`): the pack's four ringed icons, alone
  (`ValueIcon`, `ValueMark`) and with their labels (`BrandValues`). Decorative; the text beside
  them is real text.
- **Product photos** are uploaded in the admin and served as WebP renditions with `srcset`
  ([ADR-009](../architecture/decisions.md)). XC2025, G8810, 8830 and 8009 have pack shots made
  from their print files (front and back); the other demonstration products keep pack shots and
  leaf studies drawn in code ([ADR-014](../architecture/decisions.md)).
- **Illustrations** (ten tea-type medallions, and a neutral sand-and-gold one when none is chosen,
  so a category or product of any kind gets a fitting mark) are inline SVG components, also used
  as the placeholder when a product has no photo. Medallions are always shown whole (never cropped by a
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
- **Hero:** the lake from the front of the pack seen through a moon gate, and one featured
  product at a time in front of it. A pack shot on a transparent background (PNG or WebP, at least
  1600 px tall, tightly cropped) stands free on the stage; the upload marks it automatically
  (transparent corners). Products with only an ordinary photograph are shown inside the gate
  instead.
- **Gallery ("Lavhalar"):** real photographs and short films only — tea gardens, the packs,
  brewing, people at work with their permission. Landscape pictures at least 2000 px wide suit the
  large tiles; films as web-ready MP4 (H.264/AAC) or WebM up to 64 MB with a poster frame, and with
  sound that makes sense when a visitor chooses to play it (nothing plays by itself).
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
