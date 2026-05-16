-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "completedProjectsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hackathonWinsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reputationScore" INTEGER NOT NULL DEFAULT 0;
