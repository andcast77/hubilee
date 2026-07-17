-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cashSessionId" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingFloat" DECIMAL(10,2) NOT NULL,
    "expectedCash" DECIMAL(10,2),
    "countedCash" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_registers_companyId_storeId_idx" ON "cash_registers"("companyId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_id_companyId_key" ON "cash_registers"("id", "companyId");

-- CreateIndex
CREATE INDEX "cash_sessions_companyId_storeId_status_idx" ON "cash_sessions"("companyId", "storeId", "status");

-- CreateIndex
CREATE INDEX "cash_sessions_cashRegisterId_status_idx" ON "cash_sessions"("cashRegisterId", "status");

-- CreateIndex
-- Hand-edited: Prisma's `@@unique`/`@@index` cannot express a partial WHERE clause.
-- Enforces the domain invariant "at most one OPEN CashSession per CashRegister" at the DB level
-- (design decision D5 / spec "At most one OPEN session per register"). Must be preserved by any
-- future migration that touches "cash_sessions" — do not let `prisma migrate dev` drop it as drift.
CREATE UNIQUE INDEX "cash_sessions_one_open_register" ON "cash_sessions"("cashRegisterId") WHERE "status" = 'OPEN';

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_id_companyId_key" ON "cash_sessions"("id", "companyId");

-- CreateIndex
CREATE INDEX "sales_companyId_cashSessionId_idx" ON "sales"("companyId", "cashSessionId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashSessionId_companyId_fkey" FOREIGN KEY ("cashSessionId", "companyId") REFERENCES "cash_sessions"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_storeId_companyId_fkey" FOREIGN KEY ("storeId", "companyId") REFERENCES "stores"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_storeId_companyId_fkey" FOREIGN KEY ("storeId", "companyId") REFERENCES "stores"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cashRegisterId_companyId_fkey" FOREIGN KEY ("cashRegisterId", "companyId") REFERENCES "cash_registers"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
