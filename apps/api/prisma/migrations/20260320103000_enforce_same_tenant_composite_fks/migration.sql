-- PLAN-13: enforce same-tenant relational integrity with composite FKs.
-- Use NOT VALID for production safety: new writes are enforced immediately,
-- existing historical rows can be validated in a controlled rollout.

-- 1) Composite uniqueness for tenant-bound parents.
CREATE UNIQUE INDEX IF NOT EXISTS "products_id_companyId_key" ON "products"("id", "companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "stores_id_companyId_key" ON "stores"("id", "companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_id_companyId_key" ON "customers"("id", "companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_id_companyId_key" ON "sales"("id", "companyId");

-- 2) Replace single-column FKs with tenant-aware composite FKs.
ALTER TABLE "inventory_transfers" DROP CONSTRAINT IF EXISTS "inventory_transfers_fromStoreId_fkey";
ALTER TABLE "inventory_transfers" DROP CONSTRAINT IF EXISTS "inventory_transfers_toStoreId_fkey";
ALTER TABLE "inventory_transfers" DROP CONSTRAINT IF EXISTS "inventory_transfers_productId_fkey";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_storeId_fkey";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_customerId_fkey";
ALTER TABLE "loyalty_points" DROP CONSTRAINT IF EXISTS "loyalty_points_customerId_fkey";
ALTER TABLE "loyalty_points" DROP CONSTRAINT IF EXISTS "loyalty_points_saleId_fkey";

ALTER TABLE "inventory_transfers"
  ADD CONSTRAINT "inventory_transfers_fromStoreId_companyId_fkey"
  FOREIGN KEY ("fromStoreId", "companyId") REFERENCES "stores"("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "inventory_transfers"
  ADD CONSTRAINT "inventory_transfers_toStoreId_companyId_fkey"
  FOREIGN KEY ("toStoreId", "companyId") REFERENCES "stores"("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "inventory_transfers"
  ADD CONSTRAINT "inventory_transfers_productId_companyId_fkey"
  FOREIGN KEY ("productId", "companyId") REFERENCES "products"("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_storeId_companyId_fkey"
  FOREIGN KEY ("storeId", "companyId") REFERENCES "stores"("id", "companyId")
  ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_customerId_companyId_fkey"
  FOREIGN KEY ("customerId", "companyId") REFERENCES "customers"("id", "companyId")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "loyalty_points"
  ADD CONSTRAINT "loyalty_points_customerId_companyId_fkey"
  FOREIGN KEY ("customerId", "companyId") REFERENCES "customers"("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "loyalty_points"
  ADD CONSTRAINT "loyalty_points_saleId_companyId_fkey"
  FOREIGN KEY ("saleId", "companyId") REFERENCES "sales"("id", "companyId")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

-- 3) Reduce unsafe cascade in audit history.
ALTER TABLE "action_history" DROP CONSTRAINT IF EXISTS "action_history_companyId_fkey";
ALTER TABLE "action_history" DROP CONSTRAINT IF EXISTS "action_history_userId_fkey";

ALTER TABLE "action_history"
  ADD CONSTRAINT "action_history_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "action_history"
  ADD CONSTRAINT "action_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
