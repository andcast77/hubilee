-- AlterTable: add email verification and password reset columns to users (schema has them, baseline did not)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiry" TIMESTAMP(3);

-- CreateIndex (unique constraints for tokens)
CREATE UNIQUE INDEX "users_verificationToken_key" ON "users"("verificationToken");
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
