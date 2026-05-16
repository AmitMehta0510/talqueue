-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'HACKATHON_JUDGE_ASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE 'HACKATHON_SUBMISSION_REVIEWED';
ALTER TYPE "ActivityType" ADD VALUE 'HACKATHON_WINNER_DECLARED';

-- AlterEnum
ALTER TYPE "BadgeCategory" ADD VALUE 'JUDGING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'HACKATHON_JUDGING';
ALTER TYPE "NotificationType" ADD VALUE 'HACKATHON_WINNER';

-- AlterTable
ALTER TABLE "HackathonJudge" ADD COLUMN     "canEvaluateOwnTeam" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "HackathonSubmission" ADD COLUMN     "finalScore" DOUBLE PRECISION,
ADD COLUMN     "rankingPosition" INTEGER;
