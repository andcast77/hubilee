-- CreateEnum
CREATE TYPE "TitleGrammarGender" AS ENUM ('MASCULINO', 'FEMENINO');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "titleGrammarGender" "TitleGrammarGender" NOT NULL DEFAULT 'MASCULINO';
