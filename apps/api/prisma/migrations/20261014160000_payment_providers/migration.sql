-- Online payment providers (docs/architecture/payments.md).
--
-- Additive only: two new tables for provider transactions, a unique index on the payment link
-- secret, and a partial unique index that allows at most one open payment attempt per order (the
-- database-level guard against paying the same order twice). Existing payments are all closed or
-- single cash-on-delivery attempts, so the new index cannot conflict with existing rows.
--
-- The partial index lives in this second migration because PostgreSQL cannot use enum values
-- added in the same transaction (REQUIRES_ACTION, PROCESSING were added by the previous one).

-- CreateTable
CREATE TABLE "PaymeTransaction" (
    "id" UUID NOT NULL,
    "paymeId" TEXT NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "paymeTime" BIGINT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "performTime" BIGINT NOT NULL DEFAULT 0,
    "cancelTime" BIGINT NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL,
    "reason" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTransaction" (
    "prepareId" SERIAL NOT NULL,
    "clickTransId" BIGINT NOT NULL,
    "clickPaydocId" BIGINT NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "state" INTEGER NOT NULL,
    "clickError" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTransaction_pkey" PRIMARY KEY ("prepareId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymeTransaction_paymeId_key" ON "PaymeTransaction"("paymeId");

-- CreateIndex
CREATE INDEX "PaymeTransaction_paymentId_idx" ON "PaymeTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "PaymeTransaction_paymeTime_idx" ON "PaymeTransaction"("paymeTime");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTransaction_clickTransId_key" ON "ClickTransaction"("clickTransId");

-- CreateIndex
CREATE INDEX "ClickTransaction_paymentId_idx" ON "ClickTransaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_accessTokenHash_key" ON "Payment"("accessTokenHash");

-- AddForeignKey
ALTER TABLE "PaymeTransaction" ADD CONSTRAINT "PaymeTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTransaction" ADD CONSTRAINT "ClickTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- At most one open attempt (not yet paid, failed, cancelled or expired) per order.
CREATE UNIQUE INDEX "Payment_one_open_attempt_per_order" ON "Payment"("orderId") WHERE "status" IN ('PENDING', 'REQUIRES_ACTION', 'PROCESSING');
