-- Google OAuth: accounts created (or recognised) through Google sign-in.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "google" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "googleLogin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleLogin_key" ON "User"("googleLogin");