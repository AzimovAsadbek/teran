ALTER TABLE "Payment" ADD COLUMN "fiscalPayload" JSONB;
CREATE TYPE "ClickFiscalState" AS ENUM ('QUEUED', 'CHECKING', 'COMPLETE', 'REVIEW');
ALTER TABLE "ClickTransaction"
  ADD COLUMN "fiscalState" "ClickFiscalState",
  ADD COLUMN "fiscalNextAt" TIMESTAMP(3),
  ADD COLUMN "fiscalChecks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fiscalError" TEXT;
CREATE INDEX "ClickTransaction_fiscalNextAt_idx" ON "ClickTransaction"("fiscalNextAt");
