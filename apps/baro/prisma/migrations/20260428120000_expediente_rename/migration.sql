-- Rename enum used by Expediente.status
ALTER TYPE "MensuraStatus" RENAME TO "ExpedienteStatus";

-- Parent table
ALTER TABLE "Mensura" RENAME TO "Expediente";
ALTER TABLE "Expediente" RENAME COLUMN "objetoMensuraId" TO "objetoExpedienteId";

ALTER TABLE "Expediente" RENAME CONSTRAINT "Mensura_pkey" TO "Expediente_pkey";
ALTER TABLE "Expediente" RENAME CONSTRAINT "Mensura_accountOwnerId_fkey" TO "Expediente_accountOwnerId_fkey";
ALTER TABLE "Expediente" RENAME CONSTRAINT "Mensura_principalProfessionalId_fkey" TO "Expediente_principalProfessionalId_fkey";
ALTER TABLE "Expediente" RENAME CONSTRAINT "Mensura_secondProfessionalId_fkey" TO "Expediente_secondProfessionalId_fkey";

ALTER INDEX "Mensura_accountOwnerId_idx" RENAME TO "Expediente_accountOwnerId_idx";
ALTER INDEX "Mensura_accountOwnerId_nomenclaturaCatastral_idx" RENAME TO "Expediente_accountOwnerId_nomenclaturaCatastral_idx";

-- Colindantes
ALTER TABLE "MensuraColindante" RENAME COLUMN "mensuraId" TO "expedienteId";
ALTER INDEX "MensuraColindante_mensuraId_idx" RENAME TO "ExpedienteColindante_expedienteId_idx";
ALTER TABLE "MensuraColindante" RENAME CONSTRAINT "MensuraColindante_pkey" TO "ExpedienteColindante_pkey";
ALTER TABLE "MensuraColindante" RENAME CONSTRAINT "MensuraColindante_mensuraId_fkey" TO "ExpedienteColindante_expedienteId_fkey";
ALTER TABLE "MensuraColindante" RENAME TO "ExpedienteColindante";

-- Titulo relación (deprecated model)
ALTER TABLE "MensuraTituloRelacion" RENAME COLUMN "mensuraId" TO "expedienteId";
ALTER INDEX "MensuraTituloRelacion_mensuraId_idx" RENAME TO "ExpedienteTituloRelacion_expedienteId_idx";
ALTER TABLE "MensuraTituloRelacion" RENAME CONSTRAINT "MensuraTituloRelacion_pkey" TO "ExpedienteTituloRelacion_pkey";
ALTER TABLE "MensuraTituloRelacion" RENAME CONSTRAINT "MensuraTituloRelacion_mensuraId_fkey" TO "ExpedienteTituloRelacion_expedienteId_fkey";
ALTER TABLE "MensuraTituloRelacion" RENAME TO "ExpedienteTituloRelacion";

-- Ordenantes
ALTER TABLE "MensuraOrdenante" RENAME COLUMN "mensuraId" TO "expedienteId";
ALTER INDEX "MensuraOrdenante_mensuraId_idx" RENAME TO "ExpedienteOrdenante_expedienteId_idx";
ALTER TABLE "MensuraOrdenante" RENAME CONSTRAINT "MensuraOrdenante_pkey" TO "ExpedienteOrdenante_pkey";
ALTER TABLE "MensuraOrdenante" RENAME CONSTRAINT "MensuraOrdenante_mensuraId_fkey" TO "ExpedienteOrdenante_expedienteId_fkey";
ALTER TABLE "MensuraOrdenante" RENAME TO "ExpedienteOrdenante";

-- Linderos (1:1)
ALTER TABLE "MensuraLinderos" RENAME COLUMN "mensuraId" TO "expedienteId";
ALTER INDEX "MensuraLinderos_mensuraId_key" RENAME TO "ExpedienteLinderos_expedienteId_key";
ALTER TABLE "MensuraLinderos" RENAME CONSTRAINT "MensuraLinderos_pkey" TO "ExpedienteLinderos_pkey";
ALTER TABLE "MensuraLinderos" RENAME CONSTRAINT "MensuraLinderos_mensuraId_fkey" TO "ExpedienteLinderos_expedienteId_fkey";
ALTER TABLE "MensuraLinderos" RENAME TO "ExpedienteLinderos";

-- Puntos de lindero
ALTER TABLE "MensuraLinderoPunto" RENAME CONSTRAINT "MensuraLinderoPunto_pkey" TO "ExpedienteLinderoPunto_pkey";
ALTER TABLE "MensuraLinderoPunto" RENAME CONSTRAINT "MensuraLinderoPunto_linderosId_fkey" TO "ExpedienteLinderoPunto_linderosId_fkey";
ALTER INDEX "MensuraLinderoPunto_linderosId_idx" RENAME TO "ExpedienteLinderoPunto_linderosId_idx";
ALTER TABLE "MensuraLinderoPunto" RENAME TO "ExpedienteLinderoPunto";
