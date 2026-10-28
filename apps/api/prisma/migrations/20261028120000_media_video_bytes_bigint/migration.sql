-- Films of any size (ADR-061): a film's size can pass the 2 GiB an INTEGER holds. Widening the
-- column keeps every value.
ALTER TABLE "MediaItem" ALTER COLUMN "videoBytes" SET DATA TYPE BIGINT;
