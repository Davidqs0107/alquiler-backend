-- DropIndex
DROP INDEX "PaymentReversal_paymentId_key";

-- CreateIndex
CREATE INDEX "PaymentReversal_paymentId_idx" ON "PaymentReversal"("paymentId");
