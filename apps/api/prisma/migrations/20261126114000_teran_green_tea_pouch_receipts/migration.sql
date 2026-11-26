-- The five TERAN 400 g pouches. Preserve fiscal details already entered by staff.
UPDATE "ProductVariant" AS v
SET "fiscalMxik" = '00902001001000000',
    "fiscalPackageCode" = '1653256',
    "fiscalVatPercent" = 12
FROM "Product" AS p,
  (VALUES
    ('teran-xc2025', 'TRN-XC2025-400', '4780179230021'),
    ('teran-g8810',  'TRN-G8810-400',  '4780179230014'),
    ('teran-8800',   'TRN-8800-400',   '4780179230045'),
    ('teran-8830',   'TRN-8830-400',   '4780179230038'),
    ('teran-8009',   'TRN-8009-400',   '4780179230052')
  ) AS pack(slug, sku, barcode)
WHERE p.id = v."productId" AND p.slug = pack.slug
  AND v.sku = pack.sku AND v.barcode = pack.barcode AND v."weightGrams" = 400
  AND v."fiscalMxik" IS NULL AND v."fiscalPackageCode" IS NULL AND v."fiscalVatPercent" IS NULL;
