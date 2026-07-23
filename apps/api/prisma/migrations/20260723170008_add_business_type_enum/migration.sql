-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('VERDULERIA', 'KIOSCO', 'ELECTRONICA', 'ROPA', 'ACCESORIOS', 'OTRO');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "businessType" "BusinessType";
