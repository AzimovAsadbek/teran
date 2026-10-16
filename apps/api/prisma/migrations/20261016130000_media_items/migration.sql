-- "Lavhalar": photographs and short films with translated titles and captions. New tables only.
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

CREATE TABLE "MediaItem" (
    "id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "imageKey" TEXT,
    "imageWidths" INTEGER[],
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "videoKey" TEXT,
    "videoType" TEXT,
    "videoBytes" INTEGER,
    "videoDurationSeconds" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaItemTranslation" (
    "mediaItemId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,

    CONSTRAINT "MediaItemTranslation_pkey" PRIMARY KEY ("mediaItemId","locale")
);

CREATE UNIQUE INDEX "MediaItem_imageKey_key" ON "MediaItem"("imageKey");
CREATE UNIQUE INDEX "MediaItem_videoKey_key" ON "MediaItem"("videoKey");
CREATE INDEX "MediaItem_status_position_idx" ON "MediaItem"("status", "position");

ALTER TABLE "MediaItemTranslation" ADD CONSTRAINT "MediaItemTranslation_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
