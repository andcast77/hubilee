-- Add missing indexes on high-traffic query columns.
-- These columns appear in WHERE clauses on nearly every request.

-- Auth context resolution (runs on EVERY authenticated request)
CREATE INDEX IF NOT EXISTS "company_members_userId_idx" ON "company_members"("userId");
CREATE INDEX IF NOT EXISTS "company_members_companyId_idx" ON "company_members"("companyId");
CREATE INDEX IF NOT EXISTS "company_modules_companyId_idx" ON "company_modules"("companyId");

-- Product queries (search, list, by-barcode)
CREATE INDEX IF NOT EXISTS "products_companyId_idx" ON "products"("companyId");
CREATE INDEX IF NOT EXISTS "products_companyId_barcode_idx" ON "products"("companyId", "barcode");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");

-- Category / Supplier / Customer lists
CREATE INDEX IF NOT EXISTS "categories_companyId_idx" ON "categories"("companyId");
CREATE INDEX IF NOT EXISTS "suppliers_companyId_idx" ON "suppliers"("companyId");
CREATE INDEX IF NOT EXISTS "customers_companyId_idx" ON "customers"("companyId");

-- Store list
CREATE INDEX IF NOT EXISTS "stores_companyId_idx" ON "stores"("companyId");

-- Sales queries (reports, daily, by-store)
CREATE INDEX IF NOT EXISTS "sales_companyId_createdAt_idx" ON "sales"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "sales_companyId_storeId_createdAt_idx" ON "sales"("companyId", "storeId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "sales_customerId_idx" ON "sales"("customerId");

-- Sale items join
CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx" ON "sale_items"("saleId");
CREATE INDEX IF NOT EXISTS "sale_items_productId_idx" ON "sale_items"("productId");

-- HR: Employee, TimeEntry
CREATE INDEX IF NOT EXISTS "employees_companyId_idx" ON "employees"("companyId");
CREATE INDEX IF NOT EXISTS "employees_departmentId_idx" ON "employees"("departmentId");
CREATE INDEX IF NOT EXISTS "time_entries_companyId_date_idx" ON "time_entries"("companyId", "date");
CREATE INDEX IF NOT EXISTS "time_entries_employeeId_date_idx" ON "time_entries"("employeeId", "date");

-- Notifications
CREATE INDEX IF NOT EXISTS "notifications_userId_status_idx" ON "notifications"("userId", "status");
CREATE INDEX IF NOT EXISTS "notifications_companyId_idx" ON "notifications"("companyId");

-- Audit log
CREATE INDEX IF NOT EXISTS "action_history_companyId_createdAt_idx" ON "action_history"("companyId", "createdAt" DESC);

-- Loyalty
CREATE INDEX IF NOT EXISTS "loyalty_points_companyId_customerId_idx" ON "loyalty_points"("companyId", "customerId");
