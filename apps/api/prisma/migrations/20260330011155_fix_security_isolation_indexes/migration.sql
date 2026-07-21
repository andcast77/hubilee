-- =============================================================================
-- Security, tenant isolation, structural integrity, and index improvements.
-- Safe for empty production DB. Dev cleanup deletes test rows from tables
-- that are receiving new NOT NULL companyId columns.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Dev data cleanup: remove test rows from tables that will receive a NOT NULL
-- companyId column. Safe for an empty production DB.
-- -----------------------------------------------------------------------------
DELETE FROM "work_order_parts";
DELETE FROM "special_day_assignments";
DELETE FROM "schedules";
DELETE FROM "licenses";
DELETE FROM "payroll_rules";

-- -----------------------------------------------------------------------------
-- 1. Security: rename token fields to signal hashing intent
-- -----------------------------------------------------------------------------
-- DropIndex
DROP INDEX "users_passwordResetToken_key";

-- DropIndex
DROP INDEX "users_verificationToken_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "passwordResetToken",
DROP COLUMN "verificationToken",
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "verificationTokenHash"  TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_verificationTokenHash_key" ON "users"("verificationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetTokenHash_key" ON "users"("passwordResetTokenHash");

-- -----------------------------------------------------------------------------
-- 2. Security: fix TicketConfig.storeId FK (was a raw string, no FK constraint)
-- -----------------------------------------------------------------------------
-- AddForeignKey
ALTER TABLE "ticket_configs" ADD CONSTRAINT "ticket_configs_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Security: scope PayrollRule to company
-- -----------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "payroll_rules" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "payroll_rules_companyId_idx" ON "payroll_rules"("companyId");

-- AddForeignKey
ALTER TABLE "payroll_rules" ADD CONSTRAINT "payroll_rules_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. Multi-tenant isolation: add companyId to License, Schedule,
--    SpecialDayAssignment, WorkOrderPart
-- -----------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "licenses" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "licenses_companyId_idx" ON "licenses"("companyId");

-- CreateIndex
CREATE INDEX "licenses_employeeId_idx" ON "licenses"("employeeId");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "schedules_companyId_idx" ON "schedules"("companyId");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "special_day_assignments" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "special_day_assignments_companyId_idx" ON "special_day_assignments"("companyId");

-- AddForeignKey
ALTER TABLE "special_day_assignments" ADD CONSTRAINT "special_day_assignments_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "work_order_parts" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "work_order_parts_companyId_idx" ON "work_order_parts"("companyId");

-- AddForeignKey
ALTER TABLE "work_order_parts" ADD CONSTRAINT "work_order_parts_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 5. Structural integrity: StoreInventory composite FK
-- -----------------------------------------------------------------------------
-- DropForeignKey (existing single-key FK)
ALTER TABLE "store_inventory" DROP CONSTRAINT "store_inventory_storeId_fkey";

-- AlterTable: drop the auto-generated DEFAULT on id if present
ALTER TABLE "store_inventory" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey (composite FK enforces cross-tenant safety)
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_storeId_companyId_fkey"
  FOREIGN KEY ("storeId", "companyId") REFERENCES "stores"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 6. Structural integrity: Employee uniqueness (one user per company)
-- -----------------------------------------------------------------------------
-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_userId_key" ON "employees"("companyId", "userId");

-- -----------------------------------------------------------------------------
-- 7. Consistency: rename PushSubscription table to snake_case
-- -----------------------------------------------------------------------------
-- DropForeignKey
ALTER TABLE "pushSubscriptions" DROP CONSTRAINT "pushSubscriptions_userId_fkey";

-- Rename table
ALTER TABLE "pushSubscriptions" RENAME TO "push_subscriptions";

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 8. Uniqueness constraints
-- -----------------------------------------------------------------------------
-- Holiday: one entry per date per company
CREATE UNIQUE INDEX "holidays_companyId_date_key" ON "holidays"("companyId", "date");

-- Schedule: no duplicate shift assignment for same employee/shift/day
CREATE UNIQUE INDEX "schedules_employeeId_workShiftId_dayOfWeek_key"
  ON "schedules"("employeeId", "workShiftId", "dayOfWeek");

-- LoyaltyConfig: one config per company
CREATE UNIQUE INDEX "loyalty_configs_companyId_key" ON "loyalty_configs"("companyId");

-- StoreConfig: one config per company
CREATE UNIQUE INDEX "store_configs_companyId_key" ON "store_configs"("companyId");

-- -----------------------------------------------------------------------------
-- 9. Missing indexes on tenant-scoped tables
-- -----------------------------------------------------------------------------
CREATE INDEX "audit_logs_companyId_idx"    ON "audit_logs"("companyId");
CREATE INDEX "departments_companyId_idx"   ON "departments"("companyId");
CREATE INDEX "documents_companyId_idx"     ON "documents"("companyId");
CREATE INDEX "payrolls_companyId_idx"      ON "payrolls"("companyId");
CREATE INDEX "payrolls_employeeId_idx"     ON "payrolls"("employeeId");
CREATE INDEX "roles_companyId_idx"         ON "roles"("companyId");
CREATE INDEX "work_shifts_companyId_idx"   ON "work_shifts"("companyId");

-- -----------------------------------------------------------------------------
-- 10. Sync products table: drop legacy stock columns (moved to store_inventory
--     in migration 20260310000002 but never removed from products)
-- -----------------------------------------------------------------------------
ALTER TABLE "products"
  DROP COLUMN IF EXISTS "stock",
  DROP COLUMN IF EXISTS "minStock",
  DROP COLUMN IF EXISTS "maxStock",
  DROP COLUMN IF EXISTS "storeId";

-- -----------------------------------------------------------------------------
-- 11. Re-add composite FK for sales.customerId and loyalty_points.saleId
--     (dropped temporarily by Prisma when regenerating FK constraints)
-- -----------------------------------------------------------------------------
-- DropForeignKey
ALTER TABLE "loyalty_points" DROP CONSTRAINT IF EXISTS "loyalty_points_saleId_companyId_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_customerId_companyId_fkey";

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_companyId_fkey"
  FOREIGN KEY ("customerId", "companyId") REFERENCES "customers"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_saleId_companyId_fkey"
  FOREIGN KEY ("saleId", "companyId") REFERENCES "sales"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
