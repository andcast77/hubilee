-- CreateTable
CREATE TABLE "ExpedienteColindanteNomenclatura" (
    "id" TEXT NOT NULL,
    "colindanteId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nomenclatura" TEXT NOT NULL DEFAULT '',
    "rumbo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpedienteColindanteNomenclatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpedienteColindanteNomenclatura_colindanteId_idx" ON "ExpedienteColindanteNomenclatura"("colindanteId");

-- AddForeignKey
ALTER TABLE "ExpedienteColindanteNomenclatura" ADD CONSTRAINT "ExpedienteColindanteNomenclatura_colindanteId_fkey" FOREIGN KEY ("colindanteId") REFERENCES "ExpedienteColindante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One nomenclatura row per existing colindante (preserve NC + rumbo)
INSERT INTO "ExpedienteColindanteNomenclatura" ("id", "colindanteId", "orden", "nomenclatura", "rumbo", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    c."id",
    0,
    COALESCE(c."nomenclatura", ''),
    COALESCE(c."rumbo", ''),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ExpedienteColindante" c;

ALTER TABLE "ExpedienteColindante" DROP COLUMN "nomenclatura",
DROP COLUMN "rumbo";
