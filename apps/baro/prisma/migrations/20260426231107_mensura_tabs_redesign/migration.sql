-- AlterTable
ALTER TABLE "Mensura" ADD COLUMN     "fechaOrdenTrabajo" TEXT,
ADD COLUMN     "llevPublicacionEdictos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lugarReunion" TEXT,
ADD COLUMN     "medioPublicacion" TEXT,
ADD COLUMN     "toleranciaActa" TEXT;

-- AlterTable
ALTER TABLE "MensuraColindante" ADD COLUMN     "nomenclatura" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "notificaA" TEXT NOT NULL DEFAULT 'Particular';

-- CreateTable
CREATE TABLE "MensuraOrdenante" (
    "id" TEXT NOT NULL,
    "mensuraId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL DEFAULT '',
    "caracter" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensuraOrdenante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensuraLinderos" (
    "id" TEXT NOT NULL,
    "mensuraId" TEXT NOT NULL,
    "superficieTotal" TEXT NOT NULL DEFAULT '',
    "superficieSegun" TEXT NOT NULL DEFAULT '',
    "fechaRelacionTitulos" TEXT NOT NULL DEFAULT '',
    "observacionesGenerales" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensuraLinderos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensuraLinderoPunto" (
    "id" TEXT NOT NULL,
    "linderosId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "medida" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensuraLinderoPunto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensuraOrdenante_mensuraId_idx" ON "MensuraOrdenante"("mensuraId");

-- CreateIndex
CREATE UNIQUE INDEX "MensuraLinderos_mensuraId_key" ON "MensuraLinderos"("mensuraId");

-- CreateIndex
CREATE INDEX "MensuraLinderoPunto_linderosId_idx" ON "MensuraLinderoPunto"("linderosId");

-- AddForeignKey
ALTER TABLE "MensuraOrdenante" ADD CONSTRAINT "MensuraOrdenante_mensuraId_fkey" FOREIGN KEY ("mensuraId") REFERENCES "Mensura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensuraLinderos" ADD CONSTRAINT "MensuraLinderos_mensuraId_fkey" FOREIGN KEY ("mensuraId") REFERENCES "Mensura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensuraLinderoPunto" ADD CONSTRAINT "MensuraLinderoPunto_linderosId_fkey" FOREIGN KEY ("linderosId") REFERENCES "MensuraLinderos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
