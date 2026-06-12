-- CreateEnum
CREATE TYPE "CollegeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "CompanyRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'JOB_ARCHIVED';
ALTER TYPE "ActivityType" ADD VALUE 'JOB_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'COMMUNITY_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'COMMUNITY_ARCHIVED';
ALTER TYPE "ActivityType" ADD VALUE 'CONNECTION_REQUEST_SENT';
ALTER TYPE "ActivityType" ADD VALUE 'CONNECTION_ACCEPTED';
ALTER TYPE "ActivityType" ADD VALUE 'USER_FOLLOWED';
ALTER TYPE "ActivityType" ADD VALUE 'EXPERIENCE_ADDED';

-- DropForeignKey
ALTER TABLE "Education" DROP CONSTRAINT "Education_collegeId_fkey";

-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "customCollegeName" TEXT,
ALTER COLUMN "collegeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CollegeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "website" TEXT,
    "status" "CollegeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "pendingJobData" JSONB NOT NULL,
    "status" "CompanyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "companyId" TEXT,
    "jobId" TEXT,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeRequest_userId_idx" ON "CollegeRequest"("userId");

-- CreateIndex
CREATE INDEX "CollegeRequest_status_idx" ON "CollegeRequest"("status");

-- CreateIndex
CREATE INDEX "CollegeRequest_name_idx" ON "CollegeRequest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRequest_jobId_key" ON "CompanyRequest"("jobId");

-- CreateIndex
CREATE INDEX "CompanyRequest_requestedById_idx" ON "CompanyRequest"("requestedById");

-- CreateIndex
CREATE INDEX "CompanyRequest_status_idx" ON "CompanyRequest"("status");

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeRequest" ADD CONSTRAINT "CollegeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
