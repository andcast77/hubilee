-- CreateTable
CREATE TABLE "MensuraColindante" (
    "id" TEXT NOT NULL,
    "mensuraId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "rumbo" TEXT NOT NULL DEFAULT '',
    "distancia" TEXT NOT NULL,
    "colindante" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensuraColindante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensuraColindante_mensuraId_idx" ON "MensuraColindante"("mensuraId");

-- AddForeignKey
ALTER TABLE "MensuraColindante" ADD CONSTRAINT "MensuraColindante_mensuraId_fkey" FOREIGN KEY ("mensuraId") REFERENCES "Mensura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
