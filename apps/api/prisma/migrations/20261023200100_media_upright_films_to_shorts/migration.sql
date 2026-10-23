-- The upright films already in the gallery become shorts (ADR-059): the home page's feed and
-- the gallery's "Qisqa lavhalar" now read this kind. Their order among themselves is kept.
UPDATE "MediaItem"
SET "kind" = 'SHORT'
WHERE "kind" = 'VIDEO' AND "imageWidth" IS NOT NULL AND "imageHeight" > "imageWidth";
