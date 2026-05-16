/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Hackathon` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "HackathonMode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "OrganizerType" AS ENUM ('COMPANY', 'COLLEGE', 'COMMUNITY', 'STARTUP', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'SCORED', 'WINNER', 'REJECTED');

-- AlterTable
ALTER TABLE "Hackathon" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "judgeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "judgingCriteria" JSONB,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "mode" "HackathonMode",
ADD COLUMN     "organizerName" TEXT,
ADD COLUMN     "organizerType" "OrganizerType",
ADD COLUMN     "organizerWebsite" TEXT,
ADD COLUMN     "prizes" JSONB,
ADD COLUMN     "registrationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rules" JSONB,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "sourcePlatform" TEXT,
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "sponsorWebsite" TEXT,
ADD COLUMN     "submissionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tracks" JSONB,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "winnerCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HackathonSubmission" ADD COLUMN     "engineeringScore" DOUBLE PRECISION,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "techStack" JSONB,
ADD COLUMN     "verifiedProject" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "HackathonJudge" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertise" JSONB,
    "bio" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HackathonJudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackathonEvaluation" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "innovationScore" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "designScore" DOUBLE PRECISION,
    "scalabilityScore" DOUBLE PRECISION,
    "businessScore" DOUBLE PRECISION,
    "presentationScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HackathonEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackathonWinner" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT,
    "prize" TEXT,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HackathonWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HackathonJudge_hackathonId_userId_key" ON "HackathonJudge"("hackathonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "HackathonEvaluation_submissionId_judgeId_key" ON "HackathonEvaluation"("submissionId", "judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "HackathonWinner_hackathonId_rank_key" ON "HackathonWinner"("hackathonId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Hackathon_slug_key" ON "Hackathon"("slug");

-- AddForeignKey
ALTER TABLE "HackathonJudge" ADD CONSTRAINT "HackathonJudge_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonJudge" ADD CONSTRAINT "HackathonJudge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonEvaluation" ADD CONSTRAINT "HackathonEvaluation_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonEvaluation" ADD CONSTRAINT "HackathonEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "HackathonSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonEvaluation" ADD CONSTRAINT "HackathonEvaluation_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "HackathonJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonWinner" ADD CONSTRAINT "HackathonWinner_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonWinner" ADD CONSTRAINT "HackathonWinner_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "HackathonSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
