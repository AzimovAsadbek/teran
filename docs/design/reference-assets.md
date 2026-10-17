# Reference assets — DAVIDsTEA pictures in TERAN's storefront

On 2026-10-17 the owner stated that TERAN holds written permission from DAVIDsTEA to reuse its
site's pictures, and asked for the storefront to match the reference (davidstea.com) one to one,
pictures included, so it can be shown to TERAN's client first and adjusted afterwards. A copy of
that permission belongs with the owner's records; it does not cover the reference's fonts (they are
licensed by their foundries, so the open-licence look-alikes stay, see typography.md).

The GitHub repository is public, so **no picture is committed**. The files live in two folders
under `apps/api/storage/`, which git ignores, each with a `manifest.json` listing every file, the
place it fills and the reference address it was taken from. Both are loaded with
`apps/api/scripts/import-visuals.ts` (ADR-028).

## 1. `storage/reference-assets/` — unbranded pictures (27 files, go live)

Photographs and illustrations without the DAVIDsTEA name, packs or products, and none shown as a
TERAN product. They are the pictures that go to the live site with the design (the owner asked on
2026-10-18 for the pictures to stay when the site goes live); on 2026-10-18 fourteen of the
mockup's pictures were reviewed and moved here (the globe band, three menu pictures, the black
tea cover, the contact, help, flavour and Tea 101 pictures):

| Place                                          | Files                | Shown on                                                        |
| ---------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| `about.hero`, `about.showcase`                 | 1 each               | About page: top band, showcase band                             |
| `about.idea.1` … `about.idea.3`                | 1 each               | About page: the three idea pictures                             |
| `banner:catalog`                               | desktop + phone crop | All products: the header banner                                 |
| `banner:category:green-tea`                    | desktop + phone crop | Green tea: the header banner                                    |
| `article:<slug>` (4 journal articles)          | 1 each               | Journal cards, the home pair and article pages (covers)         |
| `home.values`                                  | desktop + phone crop | Home: the values band (the globe)                               |
| `menu.collections`, `menu.learn`, `menu.about` | 1 each               | Desktop menus' cards (where the item has no picture of its own) |
| `cover:category:black-tea`                     | 1                    | Black tea: menus and category tiles                             |
| `contact.picture`, `help.returns` (one file)   | 1                    | Contact page; the help centre's returns card                    |
| `help.banner`, `help.tea`, `help.payment`      | 1 each               | Help centre: its banner and two category cards                  |
| `wholesale.flavour`                            | desktop + phone crop | For business: the wide flavour band                             |
| `tea101.amount`                                | 1                    | Tea 101: beside "how much do I need?"                           |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-assets
```

On the live site this runs against the production database with the Blob token (the same way as
the production seed, docs/deployment/vercel.md), only when the owner asks for a deploy.

## 2. `storage/reference-mockup/` — presentation mockup (43 entries, **local only**)

The reference's campaign photographs and product photographs, which show DAVIDsTEA's name, packs,
merchandise, staff and shops, other teas as TERAN's five teas, or its store map. They are for a
presentation of the look on this machine only: shown on TERAN's pages they would present another
company's brand and products as TERAN's, so they never go to the live site, where those places
show TERAN's own pictures (its pouches, the pack paintings) until TERAN uploads photographs. The manifest is marked `"localOnly": true`, and the import refuses to load it unless
`NODE_ENV` is not `production`, the database runs on this machine and `BLOB_READ_WRITE_TOKEN` is
not set.

| Place                                                                                                              | Files                               | Shown on (and what the live site shows there instead)                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.hero.1`, `home.hero.2`                                                                                       | desktop + phone crop                | Home: the two slides (live: the pack paintings)                                                                                               |
| `home.banner.1` … `home.banner.3`                                                                                  | desktop + phone crop                | Home: story, gallery and ordering banners (live: TERAN artwork)                                                                               |
| `home.bento.1` … `home.bento.4`                                                                                    | 1 each                              | Home: the four bento tiles (live: TERAN's pouches on colour)                                                                                  |
| `home.feature`                                                                                                     | desktop + phone crop                | Home: the brewing band (live: the brewing guide card)                                                                                         |
| `home.pair.1`, `home.pair.2`                                                                                       | 1 each                              | `home.pair.1` is no longer shown (the article card shows its article's cover); `home.pair.2`: the business card (live: the terraces painting) |
| `menu.shop`                                                                                                        | 1                                   | Shop menu card, for a category without a picture (live: the category's own)                                                                   |
| `product:<slug>` (the five TERAN teas)                                                                             | 2 each                              | Product cards and galleries (live: TERAN's own pouch photographs)                                                                             |
| `cover:category:<slug>` (tea, green tea, gift sets)                                                                | 1 each                              | Category covers (live: the category illustrations)                                                                                            |
| `cover:collection:teran-premium`                                                                                   | 1                                   | The premium collection's cover (live: its illustration)                                                                                       |
| `help.ordering`, `help.delivery`                                                                                   | 1 each                              | Help centre: two category cards (live: TERAN artwork)                                                                                         |
| `wholesale.hero`, `wholesale.card.1` … `wholesale.card.3`, `wholesale.why`, `wholesale.community`, `wholesale.map` | desktop + phone crop (hero), 1 each | For business (live: TERAN's pouches and paintings)                                                                                            |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-mockup
```

**Before any public launch** (or before showing the site anywhere but this machine), take it out
again and replace the pictures with TERAN's own:

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-mockup --remove
```

`--remove` deletes the mockup's page pictures (recognised by their source), the product
photographs (recognised by their content; TERAN's own photographs stay) and the covers recorded in
`storage/reference-mockup/applied.json` when it set them, unless an editor has replaced them
since. The places it filled are empty again, so the storefront falls back to TERAN's artwork.

## Not copied

- The reference's logo, texts, prices, reviews and ratings: TERAN keeps its own.
- Certification and award marks, and the press logos of the reference's wholesale page: TERAN does
  not hold them, so showing them would be a false claim (its teal card shows the pack's four values
  and its band the names of the five teas instead).
- The reference's social videos (streamed, not downloadable as files).
- The reference's fonts (see above).
