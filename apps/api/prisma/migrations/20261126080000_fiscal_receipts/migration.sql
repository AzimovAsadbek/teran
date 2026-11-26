ALTER TABLE "ProductVariant"
  ADD COLUMN "fiscalMxik" TEXT,
  ADD COLUMN "fiscalPackageCode" TEXT,
  ADD COLUMN "fiscalVatPercent" INTEGER,
  ADD CONSTRAINT "ProductVariant_fiscal_fields" CHECK (
    num_nonnulls("fiscalMxik", "fiscalPackageCode", "fiscalVatPercent") = 0 OR
    (num_nonnulls("fiscalMxik", "fiscalPackageCode", "fiscalVatPercent") = 3
     AND "fiscalMxik" ~ '^[0-9]{17}$' AND "fiscalPackageCode" ~ '^[0-9]{1,30}$'
     AND "fiscalVatPercent" BETWEEN 0 AND 100)
  );

ALTER TABLE "OrderItem"
  ADD COLUMN "fiscalMxik" TEXT,
  ADD COLUMN "fiscalPackageCode" TEXT,
  ADD COLUMN "fiscalVatPercent" INTEGER,
  ADD CONSTRAINT "OrderItem_fiscal_fields" CHECK (
    num_nonnulls("fiscalMxik", "fiscalPackageCode", "fiscalVatPercent") = 0 OR
    (num_nonnulls("fiscalMxik", "fiscalPackageCode", "fiscalVatPercent") = 3
     AND "fiscalMxik" ~ '^[0-9]{17}$' AND "fiscalPackageCode" ~ '^[0-9]{1,30}$'
     AND "fiscalVatPercent" BETWEEN 0 AND 100)
  );

ALTER TABLE "OrderItem" ADD COLUMN "fiscalBarcode" TEXT;
CREATE TYPE "FiscalOperation" AS ENUM ('PERFORM', 'CANCEL');
CREATE TABLE "FiscalReceipt" (
  "paymentId" UUID NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "operation" "FiscalOperation" NOT NULL,
  "receiptId" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "terminalId" TEXT,
  "fiscalSign" TEXT,
  "receiptUrl" TEXT,
  "receiptDate" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("paymentId", "operation")
);
