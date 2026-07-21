-- PLAN-26: account lockout + session hardening columns

ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lockedUntil" TIMESTAMP(3);

ALTER TABLE "sessions" ADD COLUMN "accessJti" TEXT;
ALTER TABLE "sessions" ADD COLUMN "companyId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "membershipRole" TEXT;
