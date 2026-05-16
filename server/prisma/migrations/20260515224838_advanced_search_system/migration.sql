-- AlterTable
ALTER TABLE "Hackathon" ADD COLUMN     "difficultyLevel" TEXT,
ADD COLUMN     "searchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "collaborationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "difficultyLevel" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "searchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "searchTags" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptingCollaborators" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "acceptingMentorship" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptingReferrals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openToInternship" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openToWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryRole" TEXT,
ADD COLUMN     "searchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "searchVisibility" BOOLEAN NOT NULL DEFAULT true;
