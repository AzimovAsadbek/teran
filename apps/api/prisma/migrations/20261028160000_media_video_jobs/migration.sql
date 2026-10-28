-- Films made ready after their upload (ADR-062): one row per item while its newest upload waits,
-- is read, copied into an MP4 or converted; a refused one keeps its reason until the next upload.
-- CreateEnum
CREATE TYPE "MediaVideoJobState" AS ENUM ('WAITING', 'WORKING', 'FAILED');

-- CreateTable
CREATE TABLE "MediaVideoJob" (
    "mediaItemId" UUID NOT NULL,
    "uploadId" TEXT NOT NULL,
    "state" "MediaVideoJobState" NOT NULL DEFAULT 'WAITING',
    "percent" INTEGER,
    "reason" TEXT,
    "makePoster" BOOLEAN NOT NULL DEFAULT false,
    "bytes" BIGINT NOT NULL,
    "actorUserId" UUID,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaVideoJob_pkey" PRIMARY KEY ("mediaItemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaVideoJob_uploadId_key" ON "MediaVideoJob"("uploadId");

-- CreateIndex
CREATE INDEX "MediaVideoJob_state_createdAt_idx" ON "MediaVideoJob"("state", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaVideoJob" ADD CONSTRAINT "MediaVideoJob_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

