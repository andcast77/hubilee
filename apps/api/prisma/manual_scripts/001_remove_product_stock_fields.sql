-- Migration: Remove deprecated stock fields from Product table
-- These fields are replaced by the StoreInventory table (per-store stock tracking).
--
-- IMPORTANT: Run 002_migrate_stock_data.sql BEFORE this migration to preserve data.

ALTER TABLE "products" DROP COLUMN IF EXISTS "stock";
ALTER TABLE "products" DROP COLUMN IF EXISTS "minStock";
ALTER TABLE "products" DROP COLUMN IF EXISTS "maxStock";
ALTER TABLE "products" DROP COLUMN IF EXISTS "storeId";
