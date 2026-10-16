-- Kinds of product beyond tea. Additive only: one enum value, two new columns (one nullable, one
-- with a default), an index and a foreign key; nothing existing is changed or removed.

-- A product none of the tea formats fits (honey, sweets, ceramics…); shown without a format.
ALTER TYPE "ProductFormat" ADD VALUE 'OTHER';

-- The product type new products in a category start with (the admin form pre-selects it).
ALTER TABLE "Category" ADD COLUMN     "productTypeId" UUID;

-- Whether products of a type have brewing guidance and a caffeine level.
ALTER TABLE "ProductType" ADD COLUMN     "brewingGuide" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Category_productTypeId_idx" ON "Category"("productTypeId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing data keeps working as before. A type whose products already have brewing values keeps
-- offering those fields…
UPDATE "ProductType" AS t
SET "brewingGuide" = true
WHERE EXISTS (
  SELECT 1
  FROM "Product" AS p
  WHERE p."productTypeId" = t."id"
    AND (p."brewTempCelsius" IS NOT NULL
      OR p."brewTimeMinSeconds" IS NOT NULL
      OR p."brewAmountGrams" IS NOT NULL
      OR p."caffeineLevel" IS NOT NULL)
);

-- …and a category whose products (its own and its subcategories') all have the same type gets it
-- as the default for new products.
UPDATE "Category" AS c
SET "productTypeId" = s."productTypeId"
FROM (
  SELECT tree."id" AS "categoryId", MIN(p."productTypeId"::text)::uuid AS "productTypeId"
  FROM "Category" AS tree
  JOIN "Category" AS member ON member."id" = tree."id" OR member."parentId" = tree."id"
  JOIN "Product" AS p ON p."categoryId" = member."id" AND p."productTypeId" IS NOT NULL
  GROUP BY tree."id"
  HAVING COUNT(DISTINCT p."productTypeId") = 1
) AS s
WHERE s."categoryId" = c."id";
