-- CreateEnum
CREATE TYPE "BaroProfessionalTitle" AS ENUM ('AGRIMENSOR', 'INGENIERO_AGRIMENSOR');

-- CreateEnum
CREATE TYPE "BaroTitleGrammarGender" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "BaroExpedienteStatus" AS ENUM ('DRAFT');

-- CreateTable
CREATE TABLE "baro_professionals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "professionalTitle" "BaroProfessionalTitle" NOT NULL DEFAULT 'AGRIMENSOR',
    "dni" TEXT NOT NULL DEFAULT '',
    "sexo" TEXT NOT NULL DEFAULT '',
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
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expedientes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "principalProfessionalId" TEXT NOT NULL,
    "secondProfessionalId" TEXT,
    "status" "BaroExpedienteStatus" NOT NULL DEFAULT 'DRAFT',
    "objetoExpedienteId" TEXT NOT NULL,
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
    "fechaOrdenTrabajo" TEXT,
    "lugarReunion" TEXT,
    "toleranciaActa" TEXT,
    "llevPublicacionEdictos" BOOLEAN NOT NULL DEFAULT false,
    "medioPublicacion" TEXT,
    "publicacionEdictoFecha" TEXT,
    "publicacionEdictoNumero" TEXT,
    "boletinOficialNota" TEXT,
    "actaNotarialNumero" TEXT,
    "actaNotarialFecha" TEXT,
    "publicacionActaObservaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expedientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_colindantes" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "distancia" TEXT NOT NULL,
    "colindante" TEXT NOT NULL,
    "descripcion" TEXT,
    "notificaA" TEXT NOT NULL DEFAULT 'Particular',
    "domicilioParcelaColindante" TEXT NOT NULL DEFAULT '',
    "domicilioTitularColindante" TEXT NOT NULL DEFAULT '',
    "dirigidoA" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_colindantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_colindante_nomenclaturas" (
    "id" TEXT NOT NULL,
    "colindanteId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nomenclatura" TEXT NOT NULL DEFAULT '',
    "rumbo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_colindante_nomenclaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_ordenantes" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL DEFAULT '',
    "sexo" TEXT NOT NULL DEFAULT '',
    "cuit" TEXT NOT NULL DEFAULT '',
    "domicilio" TEXT NOT NULL DEFAULT '',
    "caracter" TEXT NOT NULL DEFAULT '',
    "esPropietario" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_ordenantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_linderos" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "superficieTotal" TEXT NOT NULL DEFAULT '',
    "superficieSegun" TEXT NOT NULL DEFAULT '',
    "fechaRelacionTitulos" TEXT NOT NULL DEFAULT '',
    "observacionesGenerales" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_linderos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_lindero_puntos" (
    "id" TEXT NOT NULL,
    "linderosId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "medida" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_lindero_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_actuantes" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_actuantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_expediente_titulo_relaciones" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "instrumento" TEXT NOT NULL,
    "matricula" TEXT NOT NULL DEFAULT '',
    "fechaTitulo" TEXT NOT NULL DEFAULT '',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_expediente_titulo_relaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baro_professional_registrations" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "bodyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baro_professional_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "baro_professionals_userId_key" ON "baro_professionals"("userId");

-- CreateIndex
CREATE INDEX "baro_professionals_companyId_idx" ON "baro_professionals"("companyId");

-- CreateIndex
CREATE INDEX "baro_expedientes_companyId_idx" ON "baro_expedientes"("companyId");

-- CreateIndex
CREATE INDEX "baro_expedientes_companyId_nomenclaturaCatastral_idx" ON "baro_expedientes"("companyId", "nomenclaturaCatastral");

-- CreateIndex
CREATE INDEX "baro_expediente_colindantes_expedienteId_idx" ON "baro_expediente_colindantes"("expedienteId");

-- CreateIndex
CREATE INDEX "baro_expediente_colindante_nomenclaturas_colindanteId_idx" ON "baro_expediente_colindante_nomenclaturas"("colindanteId");

-- CreateIndex
CREATE INDEX "baro_expediente_ordenantes_expedienteId_idx" ON "baro_expediente_ordenantes"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "baro_expediente_linderos_expedienteId_key" ON "baro_expediente_linderos"("expedienteId");

-- CreateIndex
CREATE INDEX "baro_expediente_lindero_puntos_linderosId_idx" ON "baro_expediente_lindero_puntos"("linderosId");

-- CreateIndex
CREATE INDEX "baro_expediente_actuantes_expedienteId_idx" ON "baro_expediente_actuantes"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "baro_expediente_actuantes_expedienteId_orden_key" ON "baro_expediente_actuantes"("expedienteId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "baro_expediente_actuantes_expedienteId_professionalId_key" ON "baro_expediente_actuantes"("expedienteId", "professionalId");

-- CreateIndex
CREATE INDEX "baro_expediente_titulo_relaciones_expedienteId_idx" ON "baro_expediente_titulo_relaciones"("expedienteId");

-- CreateIndex
CREATE INDEX "baro_professional_registrations_professionalId_idx" ON "baro_professional_registrations"("professionalId");

-- AddForeignKey
ALTER TABLE "baro_professionals" ADD CONSTRAINT "baro_professionals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_professionals" ADD CONSTRAINT "baro_professionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expedientes" ADD CONSTRAINT "baro_expedientes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expedientes" ADD CONSTRAINT "baro_expedientes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expedientes" ADD CONSTRAINT "baro_expedientes_principalProfessionalId_fkey" FOREIGN KEY ("principalProfessionalId") REFERENCES "baro_professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expedientes" ADD CONSTRAINT "baro_expedientes_secondProfessionalId_fkey" FOREIGN KEY ("secondProfessionalId") REFERENCES "baro_professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_colindantes" ADD CONSTRAINT "baro_expediente_colindantes_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "baro_expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_colindante_nomenclaturas" ADD CONSTRAINT "baro_expediente_colindante_nomenclaturas_colindanteId_fkey" FOREIGN KEY ("colindanteId") REFERENCES "baro_expediente_colindantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_ordenantes" ADD CONSTRAINT "baro_expediente_ordenantes_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "baro_expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_linderos" ADD CONSTRAINT "baro_expediente_linderos_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "baro_expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_lindero_puntos" ADD CONSTRAINT "baro_expediente_lindero_puntos_linderosId_fkey" FOREIGN KEY ("linderosId") REFERENCES "baro_expediente_linderos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_actuantes" ADD CONSTRAINT "baro_expediente_actuantes_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "baro_expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_actuantes" ADD CONSTRAINT "baro_expediente_actuantes_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "baro_professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_expediente_titulo_relaciones" ADD CONSTRAINT "baro_expediente_titulo_relaciones_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "baro_expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baro_professional_registrations" ADD CONSTRAINT "baro_professional_registrations_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "baro_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
