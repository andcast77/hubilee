-- auth-identity-simplify PR3: DROP CompanyMember.employeeCode (+ unique).
-- Login identity is User.userCode only; membership no longer stores a parallel code.

DROP INDEX IF EXISTS "company_members_companyId_employeeCode_key";

ALTER TABLE "company_members" DROP COLUMN IF EXISTS "employeeCode";
