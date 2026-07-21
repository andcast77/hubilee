# Manual migration scripts

These SQL scripts were moved from `migrations/manual/` because Prisma treats every subdirectory of `migrations/` as a migration folder and expects a `migration.sql` file. Running them manually when needed.

- `002_migrate_stock_data.sql` — Populate StoreInventory from Product.stock (run BEFORE 001)
- `001_remove_product_stock_fields.sql` — Drop deprecated stock columns from products
