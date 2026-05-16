-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "achievements" JSONB,
ADD COLUMN     "documents" JSONB,
ADD COLUMN     "flaggedReason" TEXT,
ADD COLUMN     "managerEmail" TEXT,
ADD COLUMN     "managerLinkedinUrl" TEXT,
ADD COLUMN     "managerName" TEXT,
ADD COLUMN     "skillsUsed" JSONB,
ADD COLUMN     "suspicious" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamSize" INTEGER,
ADD COLUMN     "techStack" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verificationMethod" TEXT,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "workEmail" TEXT,
ADD COLUMN     "workEmailVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "engineeringScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "featuredProjectId" TEXT;
