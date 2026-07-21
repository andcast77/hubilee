-- Data migration: Populate StoreInventory from existing Product.stock/storeId
--
-- Run this BEFORE dropping columns (001_remove_product_stock_fields.sql).
-- Products WITH a storeId get their stock assigned to that store.
-- Products WITHOUT a storeId are skipped (no store to assign inventory to).

INSERT INTO "store_inventory" ("id", "companyId", "storeId", "productId", "quantity", "minStock", "maxStock", "updatedAt")
SELECT
  gen_random_uuid(),
  p."companyId",
  p."storeId",
  p.id,
  p.stock,
  COALESCE(p."minStock", 0),
  p."maxStock",
  NOW()
FROM "products" p
WHERE p."storeId" IS NOT NULL
  AND p.stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM "store_inventory" si
    WHERE si."storeId" = p."storeId" AND si."productId" = p.id
  );

-- For products that already have StoreInventory entries, update them to match
-- (in case of partial data)
UPDATE "store_inventory" si
SET
  quantity = GREATEST(si.quantity, p.stock),
  "minStock" = GREATEST(si."minStock", COALESCE(p."minStock", 0))
FROM "products" p
WHERE si."productId" = p.id
  AND p."storeId" = si."storeId"
  AND p.stock > si.quantity;
