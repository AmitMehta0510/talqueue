/*
  Warnings:

  - You are about to drop the column `collegeCommunityId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `companyCommunityId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `companyCommunityId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `CollegeMembership` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompanyCommunity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompanyCommunityMembership` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[normalizedKey]` on the table `College` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedKey` to the `College` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommunityType" AS ENUM ('COLLEGE', 'COMPANY', 'GENERAL');

-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN', 'OWNER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommunityCategory" ADD VALUE 'CODING';
ALTER TYPE "CommunityCategory" ADD VALUE 'INTERNSHIPS';
ALTER TYPE "CommunityCategory" ADD VALUE 'STARTUPS';
ALTER TYPE "CommunityCategory" ADD VALUE 'OPEN_SOURCE';
ALTER TYPE "CommunityCategory" ADD VALUE 'AI';
ALTER TYPE "CommunityCategory" ADD VALUE 'CAREER_GUIDANCE';

-- DropForeignKey
ALTER TABLE "CollegeMembership" DROP CONSTRAINT "CollegeMembership_collegeId_fkey";

-- DropForeignKey
ALTER TABLE "CollegeMembership" DROP CONSTRAINT "CollegeMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyCommunity" DROP CONSTRAINT "CompanyCommunity_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyCommunityMembership" DROP CONSTRAINT "CompanyCommunityMembership_communityId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyCommunityMembership" DROP CONSTRAINT "CompanyCommunityMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_companyCommunityId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_companyCommunityId_fkey";

-- AlterTable
ALTER TABLE "College" ADD COLUMN     "normalizedKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "collegeCommunityId",
DROP COLUMN "companyCommunityId",
ADD COLUMN     "communityId" TEXT;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "companyCommunityId",
ADD COLUMN     "communityId" TEXT;

-- DropTable
DROP TABLE "CollegeMembership";

-- DropTable
DROP TABLE "CompanyCommunity";

-- DropTable
DROP TABLE "CompanyCommunityMembership";

-- DropEnum
DROP TYPE "CompanyCommunityRole";

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "type" "CommunityType" NOT NULL,
    "category" "CommunityCategory" NOT NULL,
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collegeId" TEXT,
    "departmentId" TEXT,
    "companyId" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "tags" TEXT[],
    "searchKeywords" TEXT[],
    "autoJoinEligible" BOOLEAN NOT NULL DEFAULT false,
    "joinApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowExternalView" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "autoJoined" BOOLEAN NOT NULL DEFAULT false,
    "contributionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_type_idx" ON "Community"("type");

-- CreateIndex
CREATE INDEX "Community_category_idx" ON "Community"("category");

-- CreateIndex
CREATE INDEX "Community_collegeId_idx" ON "Community"("collegeId");

-- CreateIndex
CREATE INDEX "Community_companyId_idx" ON "Community"("companyId");

-- CreateIndex
CREATE INDEX "Community_visibility_idx" ON "Community"("visibility");

-- CreateIndex
CREATE INDEX "Community_activityScore_idx" ON "Community"("activityScore");

-- CreateIndex
CREATE INDEX "Community_trendingScore_idx" ON "Community"("trendingScore");

-- CreateIndex
CREATE INDEX "Community_createdAt_idx" ON "Community"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Community_collegeId_category_slug_key" ON "Community"("collegeId", "category", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Community_companyId_city_category_slug_key" ON "Community"("companyId", "city", "category", "slug");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_idx" ON "CommunityMember"("userId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_idx" ON "CommunityMember"("communityId");

-- CreateIndex
CREATE INDEX "CommunityMember_role_idx" ON "CommunityMember"("role");

-- CreateIndex
CREATE INDEX "CommunityMember_active_idx" ON "CommunityMember"("active");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_communityId_userId_key" ON "CommunityMember"("communityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "College_normalizedKey_key" ON "College"("normalizedKey");

-- CreateIndex
CREATE INDEX "Conversation_communityId_idx" ON "Conversation"("communityId");

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
