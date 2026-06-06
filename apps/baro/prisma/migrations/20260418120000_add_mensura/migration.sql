-- CreateEnum
CREATE TYPE "MensuraStatus" AS ENUM ('DRAFT');

-- CreateTable
CREATE TABLE "Mensura" (
    "id" TEXT NOT NULL,
    "accountOwnerId" TEXT NOT NULL,
    "principalProfessionalId" TEXT NOT NULL,
    "secondProfessionalId" TEXT,
    "status" "MensuraStatus" NOT NULL DEFAULT 'DRAFT',
    "objetoMensuraId" TEXT NOT NULL,
    "nomenclaturaCatastral" TEXT NOT NULL,
    "nomenclaturaAnulada" BOOLEAN NOT NULL DEFAULT false,
    "planoAntecedente" TEXT,
    "loteFraccion" TEXT,
    "domicilioParcela" TEXT,
    "parcial" BOOLEAN NOT NULL DEFAULT false,
    "soloOrdenTrabajo" BOOLEAN NOT NULL DEFAULT false,
    "propietario" TEXT NOT NULL,
    "domicilioPropietario" TEXT,
    "inscripcionDominio" TEXT,
    "naturalezaActo" TEXT,
    "memoriaObservaciones" TEXT,
    "motivoHidraulica" TEXT,
    "motivoFiscalia" TEXT,
    "municipio" TEXT,
    "requiereVisacionMunicipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mensura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mensura_accountOwnerId_idx" ON "Mensura"("accountOwnerId");

-- CreateIndex
CREATE INDEX "Mensura_accountOwnerId_nomenclaturaCatastral_idx" ON "Mensura"("accountOwnerId", "nomenclaturaCatastral");

-- AddForeignKey
ALTER TABLE "Mensura" ADD CONSTRAINT "Mensura_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensura" ADD CONSTRAINT "Mensura_principalProfessionalId_fkey" FOREIGN KEY ("principalProfessionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensura" ADD CONSTRAINT "Mensura_secondProfessionalId_fkey" FOREIGN KEY ("secondProfessionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
