-- Idempotency key for staff-initiated refunds.
-- A retry with the same refundKey is a no-op; concurrent partial refunds
-- are prevented with an optimistic lock on refundedAmount in code.
ALTER TABLE "Payment" ADD COLUMN "refundKey" TEXT;

CREATE UNIQUE INDEX "Payment_refundKey_key" ON "Payment"("refundKey") WHERE "refundKey" IS NOT NULL;