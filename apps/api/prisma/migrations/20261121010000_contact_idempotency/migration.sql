ALTER TABLE "ContactInquiry" ADD COLUMN "idempotencyKey" UUID;
CREATE UNIQUE INDEX "ContactInquiry_idempotencyKey_key" ON "ContactInquiry"("idempotencyKey");
