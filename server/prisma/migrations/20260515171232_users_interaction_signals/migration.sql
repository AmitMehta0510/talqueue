-- CreateEnum
CREATE TYPE "FeedItemType" AS ENUM ('POST', 'PROJECT', 'HACKATHON', 'JOB', 'COMPANY', 'PROFILE');

-- CreateEnum
CREATE TYPE "FeedInteractionType" AS ENUM ('VIEW', 'CLICK', 'LIKE', 'SAVE', 'SHARE', 'APPLY', 'OPEN_PROJECT', 'OPEN_PROFILE');

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "interactionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastInteractionAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "reactionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FeedInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "FeedItemType" NOT NULL,
    "interactionType" "FeedInteractionType" NOT NULL,
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAffinity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "messageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collaborationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skillSimilarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "socialScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recruiterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInteractionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAffinity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedUserId" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT,
    "projectId" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterestProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interestedSkills" JSONB,
    "interestedDomains" JSONB,
    "preferredJobTypes" JSONB,
    "preferredContentTypes" JSONB,
    "recruiterInterestScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openSourceAffinity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collaborationAffinity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInterestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedInteraction_userId_idx" ON "FeedInteraction"("userId");

-- CreateIndex
CREATE INDEX "FeedInteraction_targetType_targetId_idx" ON "FeedInteraction"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "FeedInteraction_interactionType_idx" ON "FeedInteraction"("interactionType");

-- CreateIndex
CREATE INDEX "FeedInteraction_createdAt_idx" ON "FeedInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "UserAffinity_userId_idx" ON "UserAffinity"("userId");

-- CreateIndex
CREATE INDEX "UserAffinity_targetUserId_idx" ON "UserAffinity"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAffinity_userId_targetUserId_key" ON "UserAffinity"("userId", "targetUserId");

-- CreateIndex
CREATE INDEX "ProfileView_viewerId_idx" ON "ProfileView"("viewerId");

-- CreateIndex
CREATE INDEX "ProfileView_viewedUserId_idx" ON "ProfileView"("viewedUserId");

-- CreateIndex
CREATE INDEX "ProfileView_createdAt_idx" ON "ProfileView"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectView_viewerId_idx" ON "ProjectView"("viewerId");

-- CreateIndex
CREATE INDEX "ProjectView_projectId_idx" ON "ProjectView"("projectId");

-- CreateIndex
CREATE INDEX "ProjectView_createdAt_idx" ON "ProjectView"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterestProfile_userId_key" ON "UserInterestProfile"("userId");

-- AddForeignKey
ALTER TABLE "FeedInteraction" ADD CONSTRAINT "FeedInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAffinity" ADD CONSTRAINT "UserAffinity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAffinity" ADD CONSTRAINT "UserAffinity_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewedUserId_fkey" FOREIGN KEY ("viewedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectView" ADD CONSTRAINT "ProjectView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectView" ADD CONSTRAINT "ProjectView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterestProfile" ADD CONSTRAINT "UserInterestProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
