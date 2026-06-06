-- Remap objetoExpedienteId catalog slugs (remove "mensura" from stored values).
UPDATE "Expediente" SET "objetoExpedienteId" = 'cabida_unica' WHERE "objetoExpedienteId" = 'mensura';
UPDATE "Expediente" SET "objetoExpedienteId" = 'cabida_unica_y_division' WHERE "objetoExpedienteId" = 'mensura_y_division';
UPDATE "Expediente" SET "objetoExpedienteId" = 'cabida_unica_division_expropiacion' WHERE "objetoExpedienteId" = 'mensura_y_division_expropiacion';
UPDATE "Expediente" SET "objetoExpedienteId" = 'cabida_unica_division_conjunto_inmobiliario' WHERE "objetoExpedienteId" = 'mensura_y_division_conjunto_inmobiliario';
UPDATE "Expediente" SET "objetoExpedienteId" = 'replanteos_e_integracion' WHERE "objetoExpedienteId" = 'mensuras_e_integracion';
UPDATE "Expediente" SET "objetoExpedienteId" = 'replanteos_para_integracion' WHERE "objetoExpedienteId" = 'mensuras_para_integracion';
UPDATE "Expediente" SET "objetoExpedienteId" = 'replanteos_para_integracion_y_division' WHERE "objetoExpedienteId" = 'mensuras_para_integracion_y_division';
UPDATE "Expediente" SET "objetoExpedienteId" = 'replanteos_y_division_anexion' WHERE "objetoExpedienteId" = 'mensuras_y_division_anexion';
UPDATE "Expediente" SET "objetoExpedienteId" = 'replanteos_integracion_y_division' WHERE "objetoExpedienteId" = 'mensuras_integracion_y_division';

-- Superficie según: stored radio label aligned with UI.
UPDATE "ExpedienteLinderos" SET "superficieSegun" = 'Replanteo' WHERE "superficieSegun" = 'Mensura';
