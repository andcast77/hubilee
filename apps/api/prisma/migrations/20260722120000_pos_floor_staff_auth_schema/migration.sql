-- pos-floor-staff-auth PR1: nullable email (partial unique), companyCode, employeeCode,
-- and one OPEN CashSession per openedByUserId.

-- ── User.email: drop full unique, allow NULL, partial unique for non-null emails ──
DROP INDEX IF EXISTS "users_email_key";

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Hand-edited: Prisma cannot express WHERE on @@unique. Preserves uniqueness for
-- present emails while allowing multiple null-email floor users.
CREATE UNIQUE INDEX "users_email_unique_not_null" ON "users"("email") WHERE "email" IS NOT NULL;

-- ── Company.companyCode: add, backfill existing rows, then NOT NULL + unique ──
ALTER TABLE "companies" ADD COLUMN "companyCode" TEXT;

-- Opaque ~16-char codes from UUID hex (no dashes). Unique retry not needed for backfill
-- because UUID collision risk is negligible across existing company rows.
UPDATE "companies"
SET "companyCode" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
WHERE "companyCode" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "companyCode" SET NOT NULL;

CREATE UNIQUE INDEX "companies_companyCode_key" ON "companies"("companyCode");

-- ── CompanyMember.employeeCode: nullable; unique (companyId, employeeCode) ──
ALTER TABLE "company_members" ADD COLUMN "employeeCode" TEXT;

CREATE UNIQUE INDEX "company_members_companyId_employeeCode_key" ON "company_members"("companyId", "employeeCode");

-- ── CashSession: at most one OPEN session per openedByUserId (hand-edited partial) ──
-- Hand-edited: Prisma's @@unique cannot express a partial WHERE clause.
-- Enforces day-1 invariant "one employee MUST NOT run two registers" at the DB level
-- (design: partial unique one OPEN CashSession per openedByUserId). Preserve on future
-- migrations that touch cash_sessions — do not let `prisma migrate dev` drop as drift.
CREATE UNIQUE INDEX "cash_sessions_one_open_opened_by" ON "cash_sessions"("openedByUserId") WHERE "status" = 'OPEN';
