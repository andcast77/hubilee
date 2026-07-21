-- Platform-scoped security events (e.g. LOGIN_FAILED without tenant) may omit companyId.
ALTER TABLE "audit_logs" ALTER COLUMN "companyId" DROP NOT NULL;
