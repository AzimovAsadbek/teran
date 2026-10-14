# Competitive benchmark: DAVIDsTEA vs TERAN

Live inspection of [davidstea.com](https://davidstea.com/) on 2026-10-14 with a real browser
(Chromium, headless and the in-app browser) at 1440 × 900 and 390 × 844, compared with the TERAN
production build of the same day. Complements the earlier [reference audit](./reference-audit.md).

## What was inspected

| Area                  | Inspected interactions                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Homepage              | Utility bar, header, hero, marquee, carousels, category tiles, footer (desktop and mobile, full page) |
| Navigation            | "Shop Tea" mega menu by hover and by keyboard (Enter, Esc), mobile drawer and its second level        |
| Search                | Overlay opened from the header, typed query with live suggestions and products                        |
| Category              | `/collections/green-tea`: banner, filter dropdowns, sort, grid, mobile filter drawer                  |
| Product               | A tea product page: gallery, variant and price, tabs, attributes, add to bag (desktop and mobile)     |
| Bag                   | Cart drawer after adding, cart page                                                                   |
| Checkout              | Shopify checkout entry viewed after adding a product; **no data entered, nothing submitted**          |
| Account               | Sign-in link (redirects to Shopify customer accounts with an e-mailed code)                           |
| Typography and colour | Computed styles of headings, body, navigation, buttons, inputs, prices                                |
| Performance           | Lighthouse 13.5 on home, category and product page (mobile and desktop)                               |

**Limitations.** The store served the Canadian region (CA, English). A cookie banner offering only
"Accept" was left unanswered (no consent was given), so the inspection reflects the
pre-consent experience. The desktop add-to-bag button could not be clicked by automation (the
sticky bar overlapped it); the bag was inspected on mobile. Checkout was viewed, not used.
Customer accounts are hosted by Shopify and were not explored. DAVIDsTEA screenshots are kept out of
this repository (their imagery is copyrighted); observations are described in words.

## Key measurements

| Measure                                   | DAVIDsTEA                                                                       | TERAN (before)         |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| Display face                              | Alternate Gothic (condensed, uppercase, up to 100 px); Oxtail for product names | Cormorant Garamond 600 |
| Interface face                            | Omnes, 16 px, weight 500, line height 1.6                                       | Manrope 16 px, 400     |
| Product card title                        | 15 px / 600 sans                                                                | ~21 px serif           |
| Price                                     | 16 px / 700                                                                     | 16–17 px / 600         |
| Buttons                                   | 48–52 px pills                                                                  | 36–52 px pills         |
| Inputs                                    | 48 px pills; checkout 47 px, 12 px radius, floating labels                      | 48 px, 16 px radius    |
| Lighthouse performance (mobile / desktop) | 31–46 / 53–74                                                                   | 88–93 / 99–100         |
| Mobile total blocking time                | 5.4–7.1 s                                                                       | 0.1–0.2 s              |
| Page weight                               | 7.1–8.3 MB                                                                      | ~0.5 MB                |
| Lighthouse accessibility                  | 94–97                                                                           | 100                    |

## Comparison matrix

Priority: **P1** do now (high impact), **P2** do in this redesign, **P3** later or optional.

| Dimension          | What DAVIDsTEA does well                                                                                                                        | TERAN today                                                                              | Gap                                                        | TERAN solution                                                                                                                    | Benefit                            | Priority |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------- |
| Brand impression   | Loud, consistent, playful voice: one display face, one photo style, one accent colour                                                           | Elegant palette, but soft and monotone; many beige panels; demo art                      | Lacks a confident type voice and contrast between surfaces | Classical serif (EB Garamond) echoing the logo, forest/ivory/gold contrast with clear surface levels, refined shape language      | Premium, recognisably TERAN        | P1       |
| Navigation         | Left category triggers, centred logo, right utilities; mega menu with vertical tabs, grouped links and a promo card                             | Same reading order; menus wrap at 1024 px; feature art clipped                           | Responsive breakdown; weaker visual hierarchy in panels    | Full menu from 1280 px, drawer below; refined panels with tiles, collections and an unclipped feature card; gold active indicator | Clean header at every width        | P1       |
| Hero               | Full-bleed photography with a huge condensed headline and one pill CTA                                                                          | Rounded panel with a glass card on an illustration; double frame on mobile               | Weak focal point, cramped mobile                           | Full-bleed, centred composition: serif headline over a refined landscape, one primary and one secondary action                    | Clear first impression             | P1       |
| Typography         | Strong hierarchy: display vs interface clearly separated; body weight 500                                                                       | Fragile serif at small sizes; old-style figures; Uzbek ʻ ʼ missing in the interface font | Legibility and hierarchy                                   | Role-based tokens (display xl–sm, title, body, label, helper, caption), Onest for interface and numbers                           | Legible Uzbek, Russian and English | P1       |
| Spacing            | Generous section spacing, tight card information                                                                                                | Even, generous spacing everywhere; mobile catalogue starts below the fold                | Density where it matters                                   | Section spacing token; compact listing header and toolbar                                                                         | Products visible sooner            | P1       |
| Product cards      | Square photo on white, italic category, bold title, rating, price · size, quick-add                                                             | Large rounded image, serif title, price, quick-add                                       | Title legibility, consistent metadata                      | Sans title (600), category eyebrow, price · pack size, quiet quick-add                                                            | Faster scanning                    | P1       |
| Catalog            | Banner, five filter dropdowns, count, sort, 4-column grid, promo tiles in grid                                                                  | Banner + chips + inline price inputs + native sort; clipped art                          | Crowded toolbar; price filter awkward                      | Toolbar with format chips, stock toggle, price in a popover; removable active filters; custom-styled native sort                  | Clear, compact filtering           | P1       |
| Product details    | Category pill, title, rating, price · size, tabs, icon attributes (caffeine, sweetness), quantity + "Add to bag · price", trust row, sticky bar | Similar structure, loud demo notice next to the CTA                                      | Visual hierarchy around the purchase                       | Strong title and price, pack-size cards, brewing attributes as icon rows, quiet demo note, trust/delivery facts                   | Confident purchase                 | P1       |
| Cart               | Drawer with free-shipping progress, stepper, remove, cross-sell, subtotal, secure checkout, express pay                                         | Drawer with progress, stepper, remove, subtotal; **full-width on desktop**               | Drawer width bug; plain layout                             | 30 rem drawer, refined line items, progress, clear footer                                                                         | Feels finished                     | P1       |
| Checkout           | Distraction-free (logo + bag only), collapsible order summary, contact then delivery                                                            | Full site header and footer; card sections                                               | Exits and visual noise                                     | Focused checkout header; numbered sections; summary with clear totals                                                             | Fewer abandoned checkouts          | P2       |
| Forms              | 47–48 px fields, floating labels                                                                                                                | Persistent labels, hints, error summary, focus to first error                            | TERAN stronger on accessibility; weaker visually           | Keep persistent labels; refine fields (10 px radius, icons in errors)                                                             | Accessible and polished            | P1       |
| Modals and drawers | Full-height drawers with sticky action ("See 37 items")                                                                                         | Native dialogs with correct focus; admin dialogs right-aligned                           | Visual polish, alignment bug                               | One drawer and one modal primitive; fixed alignment; sticky footers                                                               | Consistent overlays                | P1       |
| Color              | One accent (teal) against white and black                                                                                                       | Forest, gold, ivory with many similar beiges                                             | Too little separation                                      | Semantic tokens: canvas, white surfaces, muted, inverse forest; gold as accent only                                               | Calm, premium contrast             | P1       |
| Buttons            | Consistent pills, single accent                                                                                                                 | Mixed hand-made styles                                                                   | Consistency                                                | Variants (primary, secondary, accent, ghost, link, danger, inverse), 10 px radius, loading state; icon buttons with names         | One language                       | P1       |
| Mobile             | Image tiles in drawer, sticky purchase bar, full-screen filters                                                                                 | Similar patterns; catalogue products below the fold                                      | Density                                                    | Compact headers; same tile drawer, refined                                                                                        | Better first screen                | P1       |
| Accessibility      | Mostly good; mega-menu triggers are links acting as buttons; chat widget                                                                        | Native buttons and dialogs, labelled forms, 0 axe violations                             | TERAN ahead                                                | Keep and extend (automated axe in CI)                                                                                             | —                                  | —        |
| Performance        | 7–8 MB pages, 5–7 s blocking time on mobile                                                                                                     | 0.5 MB, 0.1–0.2 s                                                                        | TERAN far ahead                                            | Keep: no third-party scripts, pre-sized images, two variable fonts                                                                | —                                  | —        |
| Visual consistency | One photo style, one display face, repeated components                                                                                          | Many one-off components                                                                  | Consistency                                                | Shared component layer; product imagery art direction (one packshot style)                                                        | Cohesion                           | P1       |

## Strongest ideas to adapt

1. Category triggers left, centred wordmark, utilities right; mega menu with grouped links and a
   promotional card.
2. Search as a large overlay with suggestions and products together.
3. Tabbed product showcase on the homepage; category tiles; editorial blocks.
4. Product card information order: category, name, price · size, quick add.
5. Product page attributes as icon rows (we use the real brewing data: temperature, time, amount).
6. Full-height mobile filter drawer with a sticky "show N products" button (TERAN already has it).
7. Bag drawer with free-delivery progress and a single clear checkout action.
8. Distraction-free checkout.

## Deliberately not copied

- DAVIDsTEA's condensed uppercase display type, teal palette, illustration style, marquee
  slogans, copy, photography and logo.
- Its pill-shaped controls: TERAN uses a squarer, more formal shape language.
- Ratings and review counts (TERAN has no verified reviews; showing stars would be a fabricated
  claim).
- Loyalty-points messaging, express-pay buttons and third-party chat (no such services exist for
  TERAN; they would also cost performance).
- Promo tiles mixed into product grids (TERAN's catalogue is small; they would crowd it).

## Where TERAN can be better

- Trilingual from the start (Uzbek default, Russian, English) with correct Uzbek typography.
- Accessibility: real disclosure buttons, native dialogs, persistent labels, error summaries.
- Speed: a fraction of the page weight and blocking time.
- Honest commerce: no invented reviews or claims; placeholders are labelled.
