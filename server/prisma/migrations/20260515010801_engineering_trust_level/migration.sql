-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('BEGINNER', 'EMERGING', 'VERIFIED', 'ADVANCED', 'ELITE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trustLevel" "TrustLevel" NOT NULL DEFAULT 'BEGINNER';
