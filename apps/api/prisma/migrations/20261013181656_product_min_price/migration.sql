-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "minPrice" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Product_status_minPrice_idx" ON "Product"("status", "minPrice");
