-- CreateTable
CREATE TABLE "AssociatedProfessional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "professionalTitle" "ProfessionalTitle",
    "licenseSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociatedProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssociatedProfessional_userId_idx" ON "AssociatedProfessional"("userId");

-- AddForeignKey
ALTER TABLE "AssociatedProfessional" ADD CONSTRAINT "AssociatedProfessional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
