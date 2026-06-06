-- CreateTable
CREATE TABLE "ExpedienteActuante" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpedienteActuante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpedienteActuante_expedienteId_orden_key" ON "ExpedienteActuante"("expedienteId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ExpedienteActuante_expedienteId_professionalId_key" ON "ExpedienteActuante"("expedienteId", "professionalId");

-- CreateIndex
CREATE INDEX "ExpedienteActuante_expedienteId_idx" ON "ExpedienteActuante"("expedienteId");

-- AddForeignKey
ALTER TABLE "ExpedienteActuante" ADD CONSTRAINT "ExpedienteActuante_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteActuante" ADD CONSTRAINT "ExpedienteActuante_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ExpedienteActuante" ("id", "expedienteId", "professionalId", "orden", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || e.id || '0'), e.id, e."principalProfessionalId", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Expediente" e;

INSERT INTO "ExpedienteActuante" ("id", "expedienteId", "professionalId", "orden", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || e.id || '1'), e.id, e."secondProfessionalId", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Expediente" e
WHERE e."secondProfessionalId" IS NOT NULL;
