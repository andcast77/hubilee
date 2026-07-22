-- Unified login: globally unique User.loginCode for owner + floor staff.

ALTER TABLE "users" ADD COLUMN "loginCode" TEXT;

-- Prefer migrating existing per-company employee codes when they are globally unique;
-- otherwise allocate a fresh 8-digit code from UUID digits.
UPDATE "users" u
SET "loginCode" = COALESCE(
  (
    SELECT m."employeeCode"
    FROM "company_members" m
    WHERE m."userId" = u."id"
      AND m."employeeCode" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "company_members" m2
        WHERE m2."employeeCode" = m."employeeCode"
          AND m2."userId" <> u."id"
      )
    ORDER BY m."createdAt" ASC
    LIMIT 1
  ),
  lpad((abs(('x' || substr(replace(u."id"::text, '-', ''), 1, 8))::bit(32)::int) % 100000000)::text, 8, '0')
)
WHERE u."loginCode" IS NULL;

-- Resolve any residual collisions (same generated 8-digit from distinct UUIDs).
WITH dups AS (
  SELECT "loginCode"
  FROM "users"
  WHERE "loginCode" IS NOT NULL
  GROUP BY "loginCode"
  HAVING COUNT(*) > 1
)
UPDATE "users" u
SET "loginCode" = lpad((abs(('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::int) % 100000000)::text, 8, '0')
WHERE u."loginCode" IN (SELECT "loginCode" FROM dups)
  AND u."id" NOT IN (
    SELECT DISTINCT ON ("loginCode") "id"
    FROM "users"
    WHERE "loginCode" IN (SELECT "loginCode" FROM dups)
    ORDER BY "loginCode", "createdAt" ASC
  );

ALTER TABLE "users" ALTER COLUMN "loginCode" SET NOT NULL;

CREATE UNIQUE INDEX "users_loginCode_key" ON "users"("loginCode");
