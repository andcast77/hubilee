-- Separate inventory tracking from product catalog.
-- Products remain as the catalog; StoreInventory tracks per-store stock levels.

CREATE TABLE "store_inventory" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity"  INTEGER NOT NULL DEFAULT 0,
  "minStock"  INTEGER NOT NULL DEFAULT 0,
  "maxStock"  INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_inventory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "store_inventory_storeId_productId_key" ON "store_inventory"("storeId", "productId");
CREATE INDEX "store_inventory_companyId_storeId_idx" ON "store_inventory"("companyId", "storeId");

-- Seed store_inventory from existing product data:
-- For each product that has a storeId, create an inventory record.
INSERT INTO "store_inventory" ("id", "companyId", "storeId", "productId", "quantity", "minStock", "maxStock", "updatedAt")
SELECT
  gen_random_uuid(),
  p."companyId",
  p."storeId",
  p."id",
  p."stock",
  COALESCE(p."minStock", 0),
  p."maxStock",
  NOW()
FROM "products" p
WHERE p."storeId" IS NOT NULL
ON CONFLICT ("storeId", "productId") DO NOTHING;
