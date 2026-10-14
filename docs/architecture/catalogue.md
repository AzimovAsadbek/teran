# Multi-category catalogue

How the catalogue is modelled so TERAN can sell tea now and coffee, sweets, gifts or accessories
later without new code per category. Code: `apps/api/src/catalog`, `apps/api/src/admin`
(taxonomy, product types, products), `apps/web/src/components/catalog`,
`apps/web/src/app/[locale]/(store)/[category]`.

## Concepts

| Concept         | Model                                  | Purpose                                                                                                                                  |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Category        | `Category` (two levels via `parentId`) | Where a product lives and its URL: top-level (`/tea`, `/gift-sets`) and subcategories (`/tea/green-tea`). Exactly one per product.       |
| Collection      | `Collection` + `ProductCollection`     | Curated, cross-category groups (`/collections/gift-ideas`); a product can be in several.                                                 |
| Product type    | `ProductType`                          | Which characteristics a product has (tea: leaf style, flavoured; gift set: teas in the set).                                             |
| Attribute       | `AttributeDefinition` (+ options)      | A typed characteristic: TEXT, NUMBER, BOOLEAN, SELECT, MULTI_SELECT; flags _required to publish_, _filterable_, _searchable_, _visible_. |
| Attribute value | `ProductAttributeValue`                | One value per product and attribute (one row per chosen option for MULTI_SELECT).                                                        |
| Product         | `Product`                              | Name, texts, images, category, optional product type, common fields (format, caffeine, brewing).                                         |
| Variant         | `ProductVariant`                       | A pack size: SKU, price, compare-at price, stock. Orders and the bag reference variants.                                                 |

### Why not JSON or extra columns

Attribute values live in their own typed columns (`numberValue`, `booleanValue`, `optionId`,
`textValue` for localised text), validated by the API against the product type's definitions
before writing (`validateAttributeValues`), with database constraints: exactly one value column
set (`ProductAttributeValue_one_value`), one scalar value per product and attribute, attributes and
options in use cannot be deleted (`ON DELETE RESTRICT`). Filters query indexed columns
(`[attributeId, optionId]`, `[attributeId, numberValue]`, `[attributeId, booleanValue]`). The tea
columns that already existed (format, caffeine, brewing) stay as common fields so nothing breaks;
new kinds of products use attributes instead of new columns.

An attribute key used by several product types must have the same kind everywhere (checked when a
type is saved), because filters address attributes by key: `attr.net-weight=100~250` applies to
every type that has a `net-weight`.

### Gift sets

A gift set is a standalone product (format `GIFT_SET`, product type `gift-set`) with its **own
stock**. Selling one does not deduct the teas inside; its contents are described in its texts and
the `teas-in-set` attribute. This matches how TERAN would pack sets in advance; component-level
stock (kits) is not needed by any current requirement and is not built.

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
- Navigation (desktop "Shop" menu, phone menu, home rail, footer) is built from
  `GET /catalog/categories`: only active categories with visible products appear, so a new
  category shows up once it is active and has products, and disappears when deactivated.
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
   types (e.g. roast level: one choice, filterable; origin: text; decaf: yes/no, filterable).
2. Create the category **Coffee** in Admin → Categories (top level; slug `coffee`), and
   subcategories if wanted (`/coffee/beans`).
3. Create products in it, choose the product type, fill the characteristics and publish them.

The category appears in the navigation, gets its page at `/coffee`, its filters from the
filterable characteristics, sitemap entries and breadcrumbs — without frontend code. The bag,
checkout, payments and orders do not depend on the category.

## Migrations

`20261014150000_accounts_payments_catalogue` and `20261014160000_payment_providers` are additive:
new tables, nullable columns and indexes only. Existing categories stay top-level with unchanged
slugs, existing products keep their fields with no product type, order snapshots are untouched.
Both were applied to a copy of the development database (counts of products, orders, payments,
users and order totals unchanged) and to fresh test databases.

The demonstration seed was updated for the new model: a top-level **Tea** category with the tea
types as subcategories, **Gift sets**, product types `tea` and `gift-set`, and demonstration
characteristic values (typical of each demo product's style; the five TERAN identifier products
get none). On a database seeded by an earlier version the seed places the demo tea types under Tea
and gives the demo products their type once — it never overwrites anything an admin changed.
