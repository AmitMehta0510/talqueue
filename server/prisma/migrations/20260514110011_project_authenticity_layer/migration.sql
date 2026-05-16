/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RepoVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('LIVE', 'DEVELOPMENT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "commitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contributorsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deploymentStatus" "DeploymentStatus" DEFAULT 'DEVELOPMENT',
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "lastGithubSyncAt" TIMESTAMP(3),
ADD COLUMN     "liveUrl" TEXT,
ADD COLUMN     "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "primaryLanguage" TEXT,
ADD COLUMN     "pullRequestsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repoCreatedAt" TIMESTAMP(3),
ADD COLUMN     "repoUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "repoVisibility" "RepoVisibility",
ADD COLUMN     "screenshots" JSONB,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "starsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "techStack" JSONB,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoDemoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
