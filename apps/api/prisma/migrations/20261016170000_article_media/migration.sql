-- Article media (2026-10-16): photographs and films from the gallery shown with a journal article
-- (reused from the gallery, not uploaded again). Additive: a new link table only.

-- CreateTable
CREATE TABLE "ArticleMedia" (
    "articleId" UUID NOT NULL,
    "mediaItemId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleMedia_pkey" PRIMARY KEY ("articleId","mediaItemId")
);

-- CreateIndex
CREATE INDEX "ArticleMedia_mediaItemId_idx" ON "ArticleMedia"("mediaItemId");

-- AddForeignKey
ALTER TABLE "ArticleMedia" ADD CONSTRAINT "ArticleMedia_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMedia" ADD CONSTRAINT "ArticleMedia_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

