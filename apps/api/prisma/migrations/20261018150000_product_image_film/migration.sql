-- A muted film looping over a product picture (the picture is its first frame), set by the
-- import script: its storage key, type and size, and its other files ("card", "mask").
-- Additive and nullable.
ALTER TABLE "ProductImage" ADD COLUMN "videoKey" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "videoType" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "videoWidth" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "videoHeight" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "videoFiles" TEXT[] DEFAULT ARRAY[]::TEXT[];
