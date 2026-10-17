-- Brewing advice given as a range on the packs ("80–90 °C", "3–5 g per 250 ml"): the existing
-- columns keep the lower end, these hold the upper end. Additive and nullable.
ALTER TABLE "Product" ADD COLUMN "brewTempMaxCelsius" INTEGER;
ALTER TABLE "Product" ADD COLUMN "brewAmountMaxGrams" DECIMAL(4,1);
