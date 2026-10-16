# Multi-category catalogue

How the catalogue is modelled so TERAN can sell tea now and coffee, sweets, gifts or accessories
later without new code per category. Code: `apps/api/src/catalog`, `apps/api/src/admin`
(taxonomy, product types, products), `apps/web/src/components/catalog`,
`apps/web/src/app/[locale]/(store)/[category]`.

## Concepts

| Concept         | Model                                  | Purpose                                                                                                                                                                            |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category        | `Category` (two levels via `parentId`) | Where a product lives and its URL: top-level (`/tea`, `/gift-sets`) and subcategories (`/tea/green-tea`). Exactly one per product. Optional default product type for new products. |
| Collection      | `Collection` + `ProductCollection`     | Curated, cross-category groups (`/collections/gift-ideas`); a product can be in several.                                                                                           |
| Product type    | `ProductType`                          | Which characteristics a product has (tea: leaf style, flavoured; gift set: teas in the set), and whether it has brewing guidance.                                                  |
| Attribute       | `AttributeDefinition` (+ options)      | A typed characteristic: TEXT, NUMBER, BOOLEAN, SELECT, MULTI_SELECT; flags _required to publish_, _filterable_, _searchable_, _visible_.                                           |
| Attribute value | `ProductAttributeValue`                | One value per product and attribute (one row per chosen option for MULTI_SELECT).                                                                                                  |
| Product         | `Product`                              | Name, texts, images, category, optional product type, common fields (format, caffeine, brewing).                                                                                   |
| Variant         | `ProductVariant`                       | A pack size: SKU, price, compare-at price, stock. Orders and the bag reference variants.                                                                                           |

### Why not JSON or extra columns

Attribute values live in their own typed columns (`numberValue`, `booleanValue`, `optionId`,
`textValue` for localised text), validated by the API against the product type's definitions
before writing (`validateAttributeValues`), with database constraints: exactly one value column
set (`ProductAttributeValue_one_value`), one scalar value per product and attribute, attributes and
options in use cannot be deleted (`ON DELETE RESTRICT`). Filters query indexed columns
(`[attributeId, optionId]`, `[attributeId, numberValue]`, `[attributeId, booleanValue]`). The tea
columns that already existed (format, caffeine, brewing) stay as common fields so nothing breaks;
new kinds of products use attributes instead of new columns, and the tea fields step aside for
them (next section).

An attribute key used by several product types must have the same kind everywhere (checked when a
type is saved), because filters address attributes by key: `attr.net-weight=100~250` applies to
every type that has a `net-weight`.

### Gift sets

A gift set is a standalone product (format `GIFT_SET`, product type `gift-set`) with its **own
stock**. Selling one does not deduct the teas inside; its contents are described in its texts and
the `teas-in-set` attribute. This matches how TERAN would pack sets in advance; component-level
stock (kits) is not needed by any current requirement and is not built.

## Products that are not tea

The common fields were made for tea. For any other kind of product they stay out of the way, set
by data rather than by checks on category names (there is no `category === 'tea'` anywhere):

- **Format.** `ProductFormat` has a neutral value, `OTHER` ("none of the tea formats applies"). The
  storefront then names no format (product page eyebrow and details), the format filter leaves it
  out (`facets.formats`), and pack labels are built from weight and count alone ("500 g").
- **Brewing and caffeine** are offered by the admin product form only for product types with
  `brewingGuide` (tea, and later coffee or infusions), for products without a type, and for any
  product that already has such values (nothing is hidden that holds data). The storefront shows
  the brewing panel and caffeine only when the product has values.
- **Default product type per category** (`Category.productTypeId`, optional). A new product placed
  in the category starts with that type, its characteristics and, while staff have not picked a
  format, the matching format (`OTHER` for a type without brewing guidance). A subcategory without
  its own default uses its parent's. Each product still keeps its own type.
- **Illustrations.** A category or product without a chosen illustration gets a neutral TERAN
  medallion (sand and gold), not the green-tea one; listing headers and the all-products page use
  it too. Headings over category lists say "Turkum boʻyicha" / "Turkumlar", not "Choy turi".
- **Unknown characteristics degrade gracefully**: values are printed by kind (choices, yes/no,
  number with unit, text); empty ones are left out; an unknown filter key is ignored.

Limits, deliberately not built yet: categories have no uploaded photograph (only the medallion and
texts); `format` is still one shared list (a per-type list of formats would need its own model);
the header search label and placeholder still read "Choy qidirish" / "yashil choy, yasmin" — copy to
change when the first non-tea category goes live.

## Category pages and URLs

- One template (`components/catalog/category-page.tsx`) renders every category from
  `GET /catalog/category-page?path=…`: breadcrumbs from the tree, title, description, the
  subcategories as chips ("All Tea" first), the listing with filters and pagination, and the
  optional editorial text. There is no page per category.
- Routes: `/[locale]/[category]` and `/[locale]/[category]/[subcategory]`. Static pages with the
  same name win, and category slugs that would collide with them are refused
  (`RESERVED_CATEGORY_SLUGS`: about, account, admin, api, cart, catalog, checkout, …).
- A top-level category lists its own products and its subcategories'.
- **Changed addresses keep working.** Renaming a slug stores a `SlugRedirect`; moving a category
  under another parent changes its path. Requests for an old path get the current one
  (`type: 'redirect'`) and are redirected permanently. The old `/catalog/<slug>` addresses are
  answered with a real **308** by the proxy; data-dependent redirects inside a streamed page are
  client-side (meta refresh) because the status is sent before the data is known. Renamed products
  and collections redirect the same way (`GET /catalog/redirects/{products|collections}/:slug`).
- Navigation (desktop "Catalogue" panel, phone drawer, the home page's category cards, footer)
  is built from `GET /catalog/categories` through one shared tree (`apps/web/src/lib/navigation.ts`):
  every active category appears, in the admin's order, top-level categories with their
  subcategories, as soon as it is created in the admin area (one without products yet says
  "coming soon", and its page explains it instead of an empty grid); it disappears when
  deactivated. Collections follow the same rule. The home page's picture cards and the footer's
  shortcuts list only categories that have products. Each category and collection carries its own cover
  (`image`), uploaded in the admin area (`POST /admin/categories/:id/image`; WebP renditions,
  alternative text per language); cards, menu thumbnails, the listing header and the page's share
  image use it. Without one, the storefront shows the category's illustration or the neutral TERAN
  medallion — never a product's picture (a product image is not borrowed just because it exists).
- **Products and pictures.** A product cannot be put on sale without a main image (the first of its
  pictures; see ADR-021). Pictures are decoded and re-encoded by the API (real content is checked,
  not the file name), stored once per product (a repeated file is refused by its hash), described
  per language, ordered, replaced in place and removed (never the last one of a product on sale).
  Packaging cut-outs are shown whole (`contain`), photographs fill their frame (`cover`). A product
  without a picture (a draft, or one published before this rule) shows a neutral TERAN placeholder.
- SEO: canonical URL per category path, `noindex` for filtered or re-sorted listings, sitemap from
  the category paths, BreadcrumbList structured data. No ratings, reviews or claims are generated.

## Filters

`GET /catalog/products` accepts, besides category/collection/search/format/price/stock/sort/page,
attribute filters `attr.<key>=<values>`: option keys (comma separated, any of them matches), `true`
/ `false` for yes/no attributes, `min~max` for numbers (either side optional). Keys and values are
validated (lower-case words and hyphens, numbers); unknown keys are ignored so an old link shows a
wider listing instead of an error.

`facets.attributes` lists the filterable attributes of the products in the current listing with
counts per option (or the number range). Each attribute is counted **without its own filter**, so
choosing "dark" still shows how many "medium" products there are. Facets are computed with one
grouped query plus one per active attribute filter (at most ten).

The storefront keeps every filter in the URL (shareable, survives refresh, works without
JavaScript as GET forms) and shows each active filter as a removable chip.

## Admin

- **Categories**: parent (top level or a top-level category), editorial text, reserved slugs,
  two-level rule, deletion refused while products or subcategories use the category.
- **Product types** (`/admin/product-types`): attributes with kind, unit, flags and options in three
  languages. Attributes or options used by products cannot be removed or change kind; a type used
  by products cannot be deleted.
- **Products**: product type and its characteristics; a product can only be published (`ACTIVE`)
  when its required characteristics are filled; searchable characteristics are added to the
  product's search text. Changing a product's slug keeps a redirect from the old address.

All of it is enforced by the API for staff sessions (`@RequireStaff`); hiding a button is never the
protection. Admin text is stored and rendered as plain text, never as HTML.

## How to add a new category (e.g. coffee)

1. If coffee needs its own characteristics, create a product type **Coffee** in Admin → Product
   types (e.g. roast level: one choice, filterable; origin: text; decaf: yes/no, filterable), and
   tick "Brewing and caffeine" if its products have brewing guidance.
2. Create the category **Coffee** in Admin → Categories (top level; slug `coffee`), choose
   **Coffee** as its template for new products, and add subcategories if wanted (`/coffee/beans`).
3. Create products in it (the template is pre-selected), fill the characteristics and publish
   them. Choose a format only if one of the tea formats applies; otherwise leave "Other".

The category appears in the navigation, gets its page at `/coffee`, its filters from the
filterable characteristics, sitemap entries and breadcrumbs — without frontend code. The bag,
checkout, payments and orders do not depend on the category.

## Migrations

`20261016140000_flexible_catalogue` is additive as well: the enum value `OTHER`, a nullable
`Category.productTypeId` (foreign key, `ON DELETE SET NULL`, indexed) and
`ProductType.brewingGuide` (default `false`). It then fills the new columns from existing data so
nothing changes for staff: a type whose products already have brewing values gets
`brewingGuide = true`, and a category whose products (its own and its subcategories') all share
one type gets it as the default. It was tried on the test database first, then applied to the
local development database after a `pg_dump` backup (tea: brewing guidance; every tea category:
the tea type; gift sets: the gift-set type).

`20261014150000_accounts_payments_catalogue` and `20261014160000_payment_providers` are additive:
new tables, nullable columns and indexes only. Existing categories stay top-level with unchanged
slugs, existing products keep their fields with no product type, order snapshots are untouched.
Both were applied to the local development database after a backup (products, orders, order
items, payments, users, categories and the sum of order totals were counted before and after:
unchanged) and to an empty database followed by the demonstration seed (fresh setup). CI also
applies every migration to empty PostgreSQL service databases on each run.

The demonstration seed was updated for the new model: a top-level **Tea** category with the tea
types as subcategories, **Gift sets**, product types `tea` and `gift-set`, and demonstration
characteristic values (typical of each demo product's style; the five TERAN identifier products
get none). On a database seeded by an earlier version the seed places the demo tea types under Tea
and gives the demo products their type once — it never overwrites anything an admin changed.
