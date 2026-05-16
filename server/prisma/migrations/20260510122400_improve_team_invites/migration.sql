-- AlterTable
ALTER TABLE "TeamInvite" ADD COLUMN     "message" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);
