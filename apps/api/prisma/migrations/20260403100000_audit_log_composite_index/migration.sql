-- Add composite index for efficient paginated audit log queries per company
CREATE INDEX "audit_logs_companyId_createdAt_idx" ON "audit_logs" ("companyId", "createdAt" DESC);
