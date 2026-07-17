-- CreateIndex
-- Prevents two CashRegisters with the same name in the same store (e.g. a check-then-create
-- race in CashSessionBar creating a second "Caja Principal"). Additive/backfill-safe: existing
-- seeded registers use distinct names per store already.
CREATE UNIQUE INDEX "cash_registers_storeId_name_key" ON "cash_registers"("storeId", "name");
