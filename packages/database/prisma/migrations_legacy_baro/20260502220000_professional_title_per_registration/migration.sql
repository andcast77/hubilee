-- AlterTable: título y género por matrícula
ALTER TABLE "ProfessionalRegistration" ADD COLUMN "professionalTitle" "ProfessionalTitle" NOT NULL DEFAULT 'AGRIMENSOR';
ALTER TABLE "ProfessionalRegistration" ADD COLUMN "titleGrammarGender" "TitleGrammarGender" NOT NULL DEFAULT 'MASCULINO';

UPDATE "ProfessionalRegistration" AS pr
SET "professionalTitle" = p."professionalTitle",
    "titleGrammarGender" = p."titleGrammarGender"
FROM "Professional" AS p
WHERE pr."professionalId" = p.id;

-- Identificación del profesional
ALTER TABLE "Professional" ADD COLUMN "dni" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Professional" ADD COLUMN "sexo" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Professional" DROP COLUMN "professionalTitle";
ALTER TABLE "Professional" DROP COLUMN "titleGrammarGender";
