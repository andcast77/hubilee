-- Empresa preferida/por defecto en Pos por usuario
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "posPreferredCompanyId" TEXT;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_posPreferredCompanyId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_posPreferredCompanyId_fkey" FOREIGN KEY ("posPreferredCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
