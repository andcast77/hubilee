-- Pos multi-tenant: add companyId to all Pos models

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
DROP INDEX IF EXISTS "products_sku_key";
CREATE UNIQUE INDEX "products_companyId_sku_key" ON "products"("companyId", "sku");

-- AlterTable: categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: suppliers
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: customers
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: sales
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
DROP INDEX IF EXISTS "sales_invoiceNumber_key";
CREATE UNIQUE INDEX "sales_companyId_invoiceNumber_key" ON "sales"("companyId", "invoiceNumber");

-- AlterTable: store_configs
ALTER TABLE "store_configs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: ticket_configs
ALTER TABLE "ticket_configs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: user_preferences - drop single userId unique, add (userId, companyId) unique
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
DROP INDEX IF EXISTS "user_preferences_userId_key";
CREATE UNIQUE INDEX "user_preferences_userId_companyId_key" ON "user_preferences"("userId", "companyId");

-- AlterTable: inventory_transfers
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: loyalty_configs
ALTER TABLE "loyalty_configs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: loyalty_points
ALTER TABLE "loyalty_points" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: action_history
ALTER TABLE "action_history" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- CreateTable: stores (with companyId); if table already exists, add column
CREATE TABLE IF NOT EXISTS "stores" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- Add foreign keys to companies
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_companyId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_companyId_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "suppliers_companyId_fkey";
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_companyId_fkey";
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_companyId_fkey";
ALTER TABLE "sales" ADD CONSTRAINT "sales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_configs" DROP CONSTRAINT IF EXISTS "store_configs_companyId_fkey";
ALTER TABLE "store_configs" ADD CONSTRAINT "store_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_configs" DROP CONSTRAINT IF EXISTS "ticket_configs_companyId_fkey";
ALTER TABLE "ticket_configs" ADD CONSTRAINT "ticket_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_companyId_fkey";
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" DROP CONSTRAINT IF EXISTS "inventory_transfers_companyId_fkey";
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_configs" DROP CONSTRAINT IF EXISTS "loyalty_configs_companyId_fkey";
ALTER TABLE "loyalty_configs" ADD CONSTRAINT "loyalty_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_points" DROP CONSTRAINT IF EXISTS "loyalty_points_companyId_fkey";
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_history" DROP CONSTRAINT IF EXISTS "action_history_companyId_fkey";
ALTER TABLE "action_history" ADD CONSTRAINT "action_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_companyId_fkey";
ALTER TABLE "stores" ADD CONSTRAINT "stores_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
