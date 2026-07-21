-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "idNumberHash" TEXT;

-- CreateIndex
CREATE INDEX "employees_companyId_idNumberHash_idx" ON "employees"("companyId", "idNumberHash");
