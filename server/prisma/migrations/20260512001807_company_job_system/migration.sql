/*
  Warnings:

  - You are about to drop the column `companyName` on the `ReferralRequest` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('STARTUP', 'PRODUCT_BASED', 'SERVICE_BASED', 'ENTERPRISE', 'MNC', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'INTERNSHIP', 'PART_TIME', 'CONTRACT', 'FREELANCE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED', 'DRAFT');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "companyName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ReferralRequest" DROP COLUMN "companyName",
ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "websiteUrl" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "githubUrl" TEXT,
    "description" TEXT,
    "tagline" TEXT,
    "foundedYear" INTEGER,
    "headquarters" TEXT,
    "industry" TEXT,
    "type" "CompanyType",
    "size" "CompanySize",
    "totalEmployees" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "careersPageUrl" TEXT,
    "hiringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postedById" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "perks" TEXT,
    "location" TEXT,
    "workMode" "WorkMode",
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "experienceLevel" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT DEFAULT 'INR',
    "openings" INTEGER,
    "skillsRequired" TEXT[],
    "applicationDeadline" TIMESTAMP(3),
    "applyUrl" TEXT,
    "externalJobId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
