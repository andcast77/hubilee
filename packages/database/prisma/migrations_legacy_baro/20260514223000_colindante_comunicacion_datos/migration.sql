-- Comunicación de mensura: domicilios y "dirigido a"; notificación alineada a ManagerDoc.
ALTER TABLE "ExpedienteColindante" ADD COLUMN     "domicilioParcelaColindante" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExpedienteColindante" ADD COLUMN     "domicilioTitularColindante" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExpedienteColindante" ADD COLUMN     "dirigidoA" TEXT NOT NULL DEFAULT '';

UPDATE "ExpedienteColindante" SET "notificaA" = 'Ente' WHERE "notificaA" = 'Municipal';
