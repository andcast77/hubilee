-- Unifica UserProfile + AssociatedProfessional en Professional; User.titularProfessionalId apunta al titular.

-- Recuperación si una ejecución anterior falló tras crear "Professional"
DROP TABLE IF EXISTS "Professional" CASCADE;

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "accountOwnerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "professionalTitle" "ProfessionalTitle" NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "professionalEmail" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "locality" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'San Juan',
    "postalCode" TEXT,
    "websiteUrl" TEXT,
    "cuit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- Titulares (ex UserProfile), conservar ids para no tocar matrículas existentes
INSERT INTO "Professional" (
    "id", "accountOwnerId", "displayName", "professionalTitle", "phone", "whatsapp", "professionalEmail",
    "addressLine1", "addressLine2", "locality", "province", "postalCode", "websiteUrl", "cuit", "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "displayName", "professionalTitle", "phone", "whatsapp", "professionalEmail",
    "addressLine1", "addressLine2", "locality", "province", "postalCode", "websiteUrl", "cuit", "createdAt", "updatedAt"
FROM "UserProfile";

-- Colaboradores (ex AssociatedProfessional)
INSERT INTO "Professional" (
    "id", "accountOwnerId", "displayName", "professionalTitle", "phone", "whatsapp", "professionalEmail",
    "addressLine1", "addressLine2", "locality", "province", "postalCode", "websiteUrl", "cuit", "createdAt", "updatedAt"
)
SELECT
    ap."id",
    ap."userId",
    ap."displayName",
    COALESCE(ap."professionalTitle", 'AGRIMENSOR'::"ProfessionalTitle"),
    NULL,
    NULL,
    NULL,
    '— Completar domicilio profesional',
    NULL,
    'Capital',
    'San Juan',
    NULL,
    NULL,
    NULL,
    ap."createdAt",
    ap."updatedAt"
FROM "AssociatedProfessional" ap;

-- Al menos una matrícula por colaborador migrado (columna aún se llama profileId)
INSERT INTO "ProfessionalRegistration" ("id", "profileId", "licenseNumber", "jurisdiction", "bodyName", "createdAt", "updatedAt")
SELECT
    concat('mig_', ap."id"),
    ap."id",
    CASE
        WHEN ap."licenseSummary" IS NOT NULL AND btrim(ap."licenseSummary") <> '' THEN left(btrim(ap."licenseSummary"), 500)
        ELSE 'Pendiente'
    END,
    '—',
    NULL,
    ap."createdAt",
    ap."updatedAt"
FROM "AssociatedProfessional" ap;

-- Usuario → titular
ALTER TABLE "User" ADD COLUMN "titularProfessionalId" TEXT;

UPDATE "User" u
SET "titularProfessionalId" = up."id"
FROM "UserProfile" up
WHERE up."userId" = u."id";

CREATE UNIQUE INDEX "User_titularProfessionalId_key" ON "User"("titularProfessionalId");

ALTER TABLE "User" ADD CONSTRAINT "User_titularProfessionalId_fkey" FOREIGN KEY ("titularProfessionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Matrículas → Professional
ALTER TABLE "ProfessionalRegistration" DROP CONSTRAINT "ProfessionalRegistration_profileId_fkey";

ALTER TABLE "ProfessionalRegistration" RENAME COLUMN "profileId" TO "professionalId";

DROP INDEX IF EXISTS "ProfessionalRegistration_profileId_idx";

CREATE INDEX "ProfessionalRegistration_professionalId_idx" ON "ProfessionalRegistration"("professionalId");

ALTER TABLE "ProfessionalRegistration" ADD CONSTRAINT "ProfessionalRegistration_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Professional_accountOwnerId_idx" ON "Professional"("accountOwnerId");

ALTER TABLE "Professional" ADD CONSTRAINT "Professional_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "UserProfile";

DROP TABLE "AssociatedProfessional";
