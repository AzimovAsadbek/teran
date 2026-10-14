-- Customer accounts, payments and a multi-category catalogue (additive only).
--
-- Nothing is deleted or rewritten: existing categories stay top-level with their slugs, existing
-- products have no product type (common fields only), existing payments get provider CASH (they
-- are all cash on delivery). See docs/architecture/cart-and-account.md, payments.md and catalogue.md.

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CASH', 'DEMO', 'CLICK', 'PAYME');

-- CreateEnum
CREATE TYPE "AttributeKind" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "RedirectEntity" AS ENUM ('CATEGORY', 'PRODUCT', 'COLLECTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CLICK';
ALTER TYPE "PaymentMethod" ADD VALUE 'PAYME';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REQUIRES_ACTION';
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- DropIndex
DROP INDEX "Payment_method_providerReference_key";

-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "CategoryTranslation" ADD COLUMN     "body" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productTypeId" UUID;

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "landmark" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeTranslation" (
    "productTypeId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductTypeTranslation_pkey" PRIMARY KEY ("productTypeId","locale")
);

-- CreateTable
CREATE TABLE "AttributeDefinition" (
    "id" UUID NOT NULL,
    "productTypeId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "AttributeKind" NOT NULL,
    "unit" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "isSearchable" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeDefinitionTranslation" (
    "attributeId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "hint" TEXT,

    CONSTRAINT "AttributeDefinitionTranslation_pkey" PRIMARY KEY ("attributeId","locale")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOptionTranslation" (
    "optionId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AttributeOptionTranslation_pkey" PRIMARY KEY ("optionId","locale")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "optionId" UUID,
    "numberValue" DECIMAL(14,3),
    "booleanValue" BOOLEAN,
    "textValue" JSONB,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlugRedirect" (
    "id" UUID NOT NULL,
    "entity" "RedirectEntity" NOT NULL,
    "fromSlug" TEXT NOT NULL,
    "toId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "fromStatus" "PaymentStatus",
    "toStatus" "PaymentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "detail" TEXT,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_createdAt_idx" ON "CustomerAddress"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_key_key" ON "ProductType"("key");

-- CreateIndex
CREATE INDEX "AttributeDefinition_productTypeId_position_idx" ON "AttributeDefinition"("productTypeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinition_productTypeId_key_key" ON "AttributeDefinition"("productTypeId", "key");

-- CreateIndex
CREATE INDEX "AttributeOption_attributeId_position_idx" ON "AttributeOption"("attributeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_key_key" ON "AttributeOption"("attributeId", "key");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_optionId_idx" ON "ProductAttributeValue"("attributeId", "optionId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_numberValue_idx" ON "ProductAttributeValue"("attributeId", "numberValue");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_booleanValue_idx" ON "ProductAttributeValue"("attributeId", "booleanValue");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_optionId_key" ON "ProductAttributeValue"("productId", "attributeId", "optionId");

-- CreateIndex
CREATE INDEX "SlugRedirect_entity_toId_idx" ON "SlugRedirect"("entity", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_entity_fromSlug_key" ON "SlugRedirect"("entity", "fromSlug");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "Category_parentId_isActive_position_idx" ON "Category"("parentId", "isActive", "position");

-- CreateIndex
CREATE INDEX "Payment_orderId_createdAt_idx" ON "Payment"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerReference_key" ON "Payment"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "Product_productTypeId_idx" ON "Product"("productTypeId");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeTranslation" ADD CONSTRAINT "ProductTypeTranslation_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeDefinition" ADD CONSTRAINT "AttributeDefinition_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeDefinitionTranslation" ADD CONSTRAINT "AttributeDefinitionTranslation_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOptionTranslation" ADD CONSTRAINT "AttributeOptionTranslation_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Rules Prisma cannot express ────────────────────────────────────────────

-- A category cannot be its own parent (the API also limits the tree to two levels).
ALTER TABLE "Category" ADD CONSTRAINT "Category_parent_not_self" CHECK ("parentId" IS NULL OR "parentId" <> "id");

-- At most one default address per customer.
CREATE UNIQUE INDEX "CustomerAddress_one_default_per_user" ON "CustomerAddress"("userId") WHERE "isDefault";

-- Text, number and yes/no values: one row per product and attribute (choices may have several).
CREATE UNIQUE INDEX "ProductAttributeValue_one_scalar_per_attribute" ON "ProductAttributeValue"("productId", "attributeId") WHERE "optionId" IS NULL;

-- Exactly one value column is set.
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_one_value" CHECK (
  ("optionId" IS NOT NULL)::int + ("numberValue" IS NOT NULL)::int + ("booleanValue" IS NOT NULL)::int + ("textValue" IS NOT NULL)::int = 1
);
