-- Enforce NOT NULL on companyId for all tenant-scoped tables.
-- Delete orphan rows (companyId IS NULL) before adding constraint.

DELETE FROM "products" WHERE "companyId" IS NULL;
DELETE FROM "categories" WHERE "companyId" IS NULL;
DELETE FROM "suppliers" WHERE "companyId" IS NULL;
DELETE FROM "customers" WHERE "companyId" IS NULL;
DELETE FROM "sales" WHERE "companyId" IS NULL;
DELETE FROM "stores" WHERE "companyId" IS NULL;
DELETE FROM "store_configs" WHERE "companyId" IS NULL;
DELETE FROM "ticket_configs" WHERE "companyId" IS NULL;
DELETE FROM "user_preferences" WHERE "companyId" IS NULL;
DELETE FROM "inventory_transfers" WHERE "companyId" IS NULL;
DELETE FROM "loyalty_configs" WHERE "companyId" IS NULL;
DELETE FROM "loyalty_points" WHERE "companyId" IS NULL;
DELETE FROM "notifications" WHERE "companyId" IS NULL;
DELETE FROM "action_history" WHERE "companyId" IS NULL;

-- Delete orphan sales (storeId IS NULL)
DELETE FROM "sales" WHERE "storeId" IS NULL;

ALTER TABLE "products" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "stores" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "store_configs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ticket_configs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "user_preferences" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "inventory_transfers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "loyalty_configs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "loyalty_points" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "action_history" ALTER COLUMN "companyId" SET NOT NULL;
