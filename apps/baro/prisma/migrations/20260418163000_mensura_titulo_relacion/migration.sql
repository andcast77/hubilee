-- CreateTable
CREATE TABLE "MensuraTituloRelacion" (
    "id" TEXT NOT NULL,
    "mensuraId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "instrumento" TEXT NOT NULL,
    "matricula" TEXT NOT NULL DEFAULT '',
    "fechaTitulo" TEXT NOT NULL DEFAULT '',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensuraTituloRelacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensuraTituloRelacion_mensuraId_idx" ON "MensuraTituloRelacion"("mensuraId");

-- AddForeignKey
ALTER TABLE "MensuraTituloRelacion" ADD CONSTRAINT "MensuraTituloRelacion_mensuraId_fkey" FOREIGN KEY ("mensuraId") REFERENCES "Mensura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
