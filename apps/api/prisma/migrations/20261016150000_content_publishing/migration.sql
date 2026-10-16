-- Content publishing (2026-10-16): cover pictures for categories, collections and articles,
-- per-language alt text and duplicate detection for product images, featured/archived articles,
-- subtitles for gallery films, article slug redirects and the Telegram announcement outbox.
-- Additive only: new nullable columns, columns with defaults, new enum values and new tables.


-- CreateEnum
CREATE TYPE "TelegramEntity" AS ENUM ('PRODUCT', 'ARTICLE');

-- CreateEnum
CREATE TYPE "TelegramPostStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterEnum
ALTER TYPE "RedirectEntity" ADD VALUE 'ARTICLE';

-- AlterEnum
ALTER TYPE "ArticleStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageKey" TEXT,
ADD COLUMN     "imageTransparent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "imageWidths" INTEGER[];

-- AlterTable
ALTER TABLE "CategoryTranslation" ADD COLUMN     "imageAlt" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageKey" TEXT,
ADD COLUMN     "imageTransparent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "imageWidths" INTEGER[];

-- AlterTable
ALTER TABLE "CollectionTranslation" ADD COLUMN     "imageAlt" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "announceOnTelegram" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "contentHash" TEXT;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "announceOnTelegram" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coverHeight" INTEGER,
ADD COLUMN     "coverKey" TEXT,
ADD COLUMN     "coverWidth" INTEGER,
ADD COLUMN     "coverWidths" INTEGER[],
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ArticleTranslation" ADD COLUMN     "coverAlt" TEXT;

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "captionsKey" TEXT;

-- CreateTable
CREATE TABLE "ProductImageTranslation" (
    "imageId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "altText" TEXT NOT NULL,

    CONSTRAINT "ProductImageTranslation_pkey" PRIMARY KEY ("imageId","locale")
);

-- CreateTable
CREATE TABLE "TelegramPost" (
    "id" UUID NOT NULL,
    "entityType" "TelegramEntity" NOT NULL,
    "entityId" UUID NOT NULL,
    "status" "TelegramPostStatus" NOT NULL DEFAULT 'PENDING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "messageIds" TEXT[],
    "text" TEXT,
    "imageKey" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "requestedById" UUID,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramPost_status_nextAttemptAt_idx" ON "TelegramPost"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "TelegramPost_createdAt_idx" ON "TelegramPost"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPost_entityType_entityId_key" ON "TelegramPost"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_imageKey_key" ON "Category"("imageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_imageKey_key" ON "Collection"("imageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_contentHash_key" ON "ProductImage"("productId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "Article_coverKey_key" ON "Article"("coverKey");

-- CreateIndex
CREATE INDEX "Article_status_isFeatured_publishedAt_idx" ON "Article"("status", "isFeatured", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_captionsKey_key" ON "MediaItem"("captionsKey");

-- AddForeignKey
ALTER TABLE "ProductImageTranslation" ADD CONSTRAINT "ProductImageTranslation_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ProductImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

