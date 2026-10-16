-- Product images with a transparent background (cut-outs), detected when they are uploaded. The
-- home page stage shows them standing free; existing rows are photographs until re-uploaded.
ALTER TABLE "ProductImage" ADD COLUMN "transparent" BOOLEAN NOT NULL DEFAULT false;
