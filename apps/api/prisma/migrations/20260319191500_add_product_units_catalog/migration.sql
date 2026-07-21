-- Global units catalog for product measurement type (no numeric size).

CREATE TABLE "units" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "units_key_key" ON "units"("key");

ALTER TABLE "products" ADD COLUMN "unitId" TEXT;
CREATE INDEX "products_unitId_idx" ON "products"("unitId");

ALTER TABLE "products"
  ADD CONSTRAINT "products_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed base global units (idempotent).
INSERT INTO "units" ("id", "key", "name", "symbol", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'UNIT', 'Unit', 'u', true, NOW(), NOW()),
  (gen_random_uuid(), 'LITER', 'Liter', 'L', true, NOW(), NOW()),
  (gen_random_uuid(), 'KILOGRAM', 'Kilogram', 'kg', true, NOW(), NOW()),
  (gen_random_uuid(), 'METER', 'Meter', 'm', true, NOW(), NOW()),
  (gen_random_uuid(), 'GRAM', 'Gram', 'g', true, NOW(), NOW()),
  (gen_random_uuid(), 'MILLILITER', 'Milliliter', 'ml', true, NOW(), NOW()),
  (gen_random_uuid(), 'CENTIMETER', 'Centimeter', 'cm', true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
