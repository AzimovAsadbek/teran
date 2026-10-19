-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingSum" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "locale" "Locale" NOT NULL,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductReview_productId_status_createdAt_idx" ON "ProductReview"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_status_createdAt_idx" ON "ProductReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Stars are whole numbers from 1 to 5 and comments stay short (the API checks both too).
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_comment_length" CHECK ("comment" IS NULL OR char_length("comment") <= 1000);
ALTER TABLE "Product" ADD CONSTRAINT "Product_rating_totals" CHECK ("ratingCount" >= 0 AND "ratingSum" >= "ratingCount" AND "ratingSum" <= 5 * "ratingCount");
