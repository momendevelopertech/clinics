-- P0#10: expenses ledger. ADDITIVE ONLY — one new (empty) table.
-- No existing row is modified. Net profit = collected payments − expenses,
-- computed at query time (see /api/analytics/dashboard and
-- /api/reports/monthly); nothing is backfilled.

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_organizationId_spentAt_idx" ON "Expense"("organizationId", "spentAt");
CREATE INDEX "Expense_organizationId_category_idx" ON "Expense"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
