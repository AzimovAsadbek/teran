# The packaging as the design source

On 2026-10-14 the owner supplied the print files of four TERAN packs and asked for the website to
follow them — and to improve on them, not just copy them. This document records what the files
contain, what the storefront takes from them, how, and the questions they raise.

## Source files

| File       | Pack          | Pages                          | Notes                                                       |
| ---------- | ------------- | ------------------------------ | ----------------------------------------------------------- |
| `2025.pdf` | XC2025 (red)  | 1: front, 2: back (210×297 mm) | CorelDRAW export (Corel PDF Engine 27), CMYK, ISO Coated v2 |
| `8009.pdf` | 8009 (green)  | 1: front, 2: back (180×290 mm) | same                                                        |
| `8810.pdf` | G8810 (black) | 1: front, 2: back (210×310 mm) | same                                                        |
| `8830.pdf` | 8830 (blue)   | 1: front, 2: back (210×297 mm) | same                                                        |

The files (100–140 MB each) are not in the repository. Text is converted to outlines; the
artwork mixes vectors, gradients and embedded images; the pasteboard outside each page holds
further copies of the artwork, which the extraction ignores.

Every pack shares one layout: the "PREMIUM CHINESE TEA" ribbon top left, 绿茶 ("green tea") with
a red 茶叶 ("tea leaves") seal top right, the logo with the line "Fikrlang, tabiatning xushta’m
lazzati." and a gold rule, the product code and "XITOY YASHIL CHOY", four ringed icons, a misty
lake with a pavilion, a window of clear film over the tea, and a coloured band with tea leaves,
"Sof tabiat / Yaxshi kayfiyat", the 400 g weight box and "Teran bilan". The back repeats the logo
over tea terraces and adds the description, preparation (Uzbek and Russian), nutrition, benefits,
storage, shelf life, producer and importer, barcode, QR code and the slogan "SOF TABIAT • YAXSHI
KAYFIYAT • TERAN BILAN". Only the pack colour changes from product to product.

## What the storefront takes from the packs

| From the packs                                   | On the site                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| The logo as printed (flat green, gold, red ®)    | Header, footer, checkout, admin, icons, social image — replaces the earlier bevelled raster                    |
| Colours, measured with the files' ICC profile    | The `forest`, `leaf` and `gold` scales ([design system](./design-system.md#colour)); `seal` for the red        |
| Lake and pavilion (front), tea terraces (back)   | Home hero; premium collection panel; the round "moon gate" view in the philosophy section                      |
| Tea leaves from the corners                      | Lower corners of the home hero                                                                                 |
| The ribbon, 绿茶 and its seal                    | Hero corners (ribbon redrawn in code; calligraphy and seal are the pack's own vectors)                         |
| The four icons and their labels                  | "What TERAN stands for" under the hero and on About                                                            |
| Seigaiha waves and the gold rule with a diamond  | Redrawn in code: hero, page headers, collection panel; under the hero tagline                                  |
| "Tayyorlash usuli" panel (green bar, icon cells) | Brewing guide on the home page and the brewing facts on product pages                                          |
| Logo line and bottom slogan                      | Footer (Uzbek in every language, as printed)                                                                   |
| The four packs                                   | Hero lineup; product images (front and back) of XC2025, G8810, 8830 and 8009 in the demo catalogue             |
| Product facts                                    | The four demo products: green tea, 400 g, brewing, description, taste, storage, shelf life, producer, importer |

Improvements over a straight copy: one quiet type system (EB Garamond and Onest) instead of the
pack's several typefaces; text over artwork always sits on a mist that keeps it above 10:1; the icons
keep their labels as real, translatable text; the brand colours were re-balanced so every text
pairing meets WCAG 2.2 AA; the pack's dense back is split into the product page's sections.

## How the assets are made

```bash
# 1. Render the print files (needs Python 3 and PyMuPDF: pip install pymupdf)
python3 apps/web/scripts/packaging/extract-packaging.py "<folder with the four PDFs>" /tmp/teran-packaging

# 2. Build the web and seed assets from those renders (from apps/web)
node scripts/packaging/build-packaging-assets.mjs /tmp/teran-packaging

# 3. Icons and the default social image from the new logo (from apps/web)
node scripts/generate-brand-assets.mjs
```

- Colours are converted with the files' own ISO Coated v2 profile, so they match the proof.
- The logo is rendered at 1200 dpi with the background artwork removed, then cut out of white
  (pixels at least 60 % away from white are opaque; edges are un-multiplied from white).
- The icons, 绿茶 and the seal are exported as vectors; the icons are recoloured TERAN green.
- **The pack shots add two things.** The window, printed as "This part will have a transparent
  coating.", is filled with an illustration of dry rolled green tea behind clear film (the real
  pack shows its tea there); and each pack is placed on the storefront's ivory backdrop with a
  soft shadow, as the art direction asks of product photography. Real photographs of the packs
  can replace them through the admin at any time.

Outputs: `apps/web/public/brand/` (logo set, `art/`, `packs/`, `ornaments/`) and
`apps/api/prisma/seed/assets/packaging/` (pack shots used by the demo seed).

## Performance

The home page's largest paint is now the lake painting instead of text, and the pack shots weigh
more than the drawn art they replace. Measured with Lighthouse on production builds (median of
three runs, 2026-10-14; mobile is Lighthouse's simulated slow 4G and varies by several points):

| Page                | Desktop        | Mobile, before → after           |
| ------------------- | -------------- | -------------------------------- |
| Home (Uzbek)        | 99, LCP 0.96 s | 90, LCP 3.57 s → 82, LCP 4.36 s  |
| Home (Russian)      | —              | 88, LCP 3.74 s → 84, LCP 4.23 s  |
| Product (pack shot) | 99, LCP 0.95 s | 86, LCP 4.05 s¹ → 78, LCP 4.77 s |
| Catalogue           | —              | 84, LCP 4.43 s → 82, LCP 4.67 s  |

¹ Before: a product with a drawn image. Accessibility stays at 100 everywhere; layout shift at 0.

What keeps it in check: the hero image (36 kB AVIF on a phone) is fetched first; the decorative
art below it (terraces, the moon gate, the leaves) is fetched at low priority; product images
gained a 480 px rendition, so a product card on a phone no longer downloads the 640 px file.

## Product facts on the packs

| Code   | Printed sentence (Uzbek)                                                                                               | Barcode (EAN-13) |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------- |
| XC2025 | Xitoyning Hunan viloyatidagi tumanli tog‘larda yetishtirilgan, ingichka va zich buralgan bargli yashil choy.           | 4780179230021    |
| 8009   | Xitoyning Hunan viloyatida yetishtirilgan, o‘ziga xos qovurilgan iforga ega yashil choy.                               | 4780179230052    |
| G8810  | Xitoyning Yunnan viloyatidagi baland tog‘li choy plantatsiyalarida yetishtirilgan, nafis bargli yashil choy.           | 4780179230014    |
| 8830   | Xitoyning Hunan viloyatidagi ekologik choy plantatsiyalarida yetishtirilgan, tabiiy iforini saqlab qolgan yashil choy. | 4780179230038    |

Common to all four: "Xitoy yashil choy", net weight 400 g; 5 g per 250 ml (1:50), 90 °C,
2–3 minutes; store dry, cool, out of sunlight, tightly closed; shelf life 24 months; producer
HUNAN EAST LAND TEA CO., LTD (Yiyang, Hunan, China); importer and packer TERAN TRADE MChJ
(Namangan); phone +998 97 570 70 07; terantea.uz and www.terantrade.uz.

The demo catalogue uses these facts for the four products (prices and stock stay placeholders).
Two things on the packs are deliberately **not** published on the website until the owner
confirms them: the benefits list (antioxidants, immunity, stress — health claims) and the
nutrition table (per 100 g: 109 kcal, 3 g carbohydrate, 25 g protein, 3 g fat).

## Questions for TERAN

1. **Region.** The detail line on every pack reads "Kelib chiqqan mamlakat va hudud: Xitoy,
   Yunnan", but the product sentences of XC2025, 8009 and 8830 say Hunan, and the taste paragraph
   on all four (G8810 included) says Hunan. Which region is right for each tea? The website shows
   the product sentence as printed and "China" as the origin.
2. **8009 or STD8009?** The first list of identifiers said STD8009; the pack says 8009. The
   website now shows 8009 (the product's address and SKU keep "std8009").
3. **Printer's note.** The front of every pack carries the red text "This part will have a
   transparent coating." inside the window. Make sure it is not printed.
4. **Health and nutrition claims.** Should the benefits list and the nutrition table appear on the
   website? Health claims may need substantiation under advertising rules.
5. **Artwork rights.** Confirm that TERAN may use the lake, terrace and leaf illustrations online
   (they may be licensed stock or commissioned art).
6. **HET8800** has no packaging file yet; the site still shows it as a demo with a provisional tea
   type.
7. **Website address.** The packs print terantea.uz and www.terantrade.uz; which one will the shop
   use?
