-- Add foreign keys for fromStoreId and toStoreId to enforce referential integrity.
-- Clean up orphan rows first (transfers pointing to non-existent stores).
DELETE FROM "inventory_transfers" WHERE "fromStoreId" NOT IN (SELECT "id" FROM "stores");
DELETE FROM "inventory_transfers" WHERE "toStoreId" NOT IN (SELECT "id" FROM "stores");

-- Add foreign key constraints
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for tenant-scoped queries and filters
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_idx" ON "inventory_transfers"("companyId");
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_fromStoreId_idx" ON "inventory_transfers"("companyId", "fromStoreId");
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_toStoreId_idx" ON "inventory_transfers"("companyId", "toStoreId");
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_productId_idx" ON "inventory_transfers"("companyId", "productId");
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_status_idx" ON "inventory_transfers"("companyId", "status");
CREATE INDEX IF NOT EXISTS "inventory_transfers_companyId_createdAt_idx" ON "inventory_transfers"("companyId", "createdAt" DESC);
