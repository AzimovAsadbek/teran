# Asset replacement brief

TERAN has no product or brand photography yet. Every image on the site is either a real TERAN
brand asset (the logo, wordmark and emblem supplied by TERAN) or an original illustration drawn in
code. No photograph has been invented, generated or borrowed, and no DAVIDsTEA or other
third-party imagery is used. This brief lists each placeholder, what should replace it and where
it appears, so TERAN can commission or supply the photographs.

**General requirements for photographs**

- Owned by TERAN or licensed for web use, with the right to crop.
- Real products and packaging only; what is shown must match what is sold.
- sRGB, JPEG or PNG (WebP is accepted too). The API re-encodes uploads to WebP at 320, 640, 960,
  1280 and 1600 px wide, so supply at least **1600 px** on the long side.
- Even, natural light; no text, watermarks or price tags in the image.

## 1. Product images (highest priority)

Uploaded per product in **Admin → Products → (product) → Images**. The first image is the main
one; the arrow buttons reorder them.

| Placeholder now                                                                                  | Replace with                                                                                                  | Aspect ratio | Minimum size | Where it appears                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------- |
| Packshot drawn in code: tin, box, gift box or wrapped pu-erh cake carrying the real TERAN emblem | Studio photograph of the actual pack, front-facing, on a plain light background (cream or white), soft shadow | 1 : 1        | 1600 × 1600  | Product cards (catalogue, search, homepage), product page gallery, bag, checkout summary, admin lists |
| "Loose-leaf study": a dish of illustrated leaves                                                 | Close-up of the dry leaf, the brewed cup, or the pack opened                                                  | 1 : 1        | 1600 × 1600  | Second image in the product gallery                                                                   |
| —                                                                                                | Optional further views (back of pack with label, brewing, gift box open)                                      | 1 : 1        | 1600 × 1600  | Product gallery                                                                                       |

Keep the subject centred with about 10 % margin: cards crop to a square and the gallery shows the
image whole. A consistent background across products makes the catalogue read as one range.

Products that need photographs (current demonstration catalogue): the five TERAN premium
collection products (XC2025, G8810, HET8800, 8830, STD8009) and every real product TERAN adds. The
other demonstration products are archived when real ones replace them.

## 2. Homepage

| Placeholder now                                            | Replace with (optional)                                                                                                               | Aspect ratio                     | Minimum size                  | Notes                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero: illustrated landscape of tea hills (SVG, dark green) | Atmospheric photograph: tea being poured into a piyola, a tea garden, or the TERAN range on a table                                   | 16 : 9 desktop, 4 : 5 phone crop | 2400 × 1350 (and 1080 × 1350) | White text sits on it, so it must stay dark and calm where the text is. Using a photo needs a small code change (the hero only takes the SVG today). |
| Category rail icons (drawn tea-leaf medallions)            | Keep: they are interface icons, not product images. Pu-erh currently shares the black-tea icon; a dedicated icon needs a code change. | 1 : 1                            | —                             | —                                                                                                                                                    |
| Collection band (text and identifiers, products below)     | No image needed                                                                                                                       | —                                | —                             | Shows the real products of the TERAN premium collection.                                                                                             |

## 3. Content pages

| Page                      | Placeholder now                                                            | Replace with                                                                              | Aspect ratio | Minimum size | Notes                                                                                         |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------ | ------------ | --------------------------------------------------------------------------------------------- |
| About (`/about`)          | Emblem medallion beside the story; "[TERAN history and photographs…]" note | Photographs for the history section (people, place, packing, tasting) and the text itself | 3 : 2        | 1600 × 1067  | Needs the history text from TERAN; adding photographs to this section is a small code change. |
| About, Contact, Wholesale | Leaf medallion in the page header (large screens only)                     | Keep, or a square brand photograph                                                        | 1 : 1        | 800 × 800    | Decorative; hidden on phones.                                                                 |
| Journal articles          | Leaf illustration per article                                              | Cover photograph per article                                                              | 16 : 10      | 1600 × 1000  | Articles have no image field yet: needs a code change if photos are wanted.                   |

## 4. Sharing and icons

| Asset                                   | Now                                          | Replace with (optional)                           | Size       |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ---------- |
| Default social image (`og-default.png`) | TERAN logo on a cream background, gold frame | Brand photograph with the logo, for link previews | 1200 × 630 |
| Favicon and app icon                    | TERAN emblem                                 | Keep (real brand asset)                           | —          |

## 5. Brand assets already in use (keep)

The logo, wordmark and emblem in `apps/web/public/brand/` come from TERAN's original logo
(`apps/web/assets/brand/teran-logo-original.webp`). If TERAN has vector (SVG or PDF) versions,
supply them: they would replace the raster files without visible change but sharper on large
screens.
