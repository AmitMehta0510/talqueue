/*
  Warnings:

  - A unique constraint covering the columns `[gstin]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cin]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[collegeId,name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[collegeId,standardDepartmentId]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sourceId,sourcePlatform]` on the table `Hackathon` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BusinessRequestType" AS ENUM ('COMPANY_CLAIM', 'RECRUITER_ONBOARDING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExternalAppStatus" AS ENUM ('APPLIED', 'PHONE_SCREEN', 'TECHNICAL_ROUND', 'HR_ROUND', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PlacementDriveStatus" AS ENUM ('UPCOMING', 'ONGOING', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlacementDriveApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEW_R1', 'INTERVIEW_R2', 'INTERVIEW_R3', 'PPO_OFFERED', 'SELECTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CollegeOfferPolicy" AS ENUM ('OPEN', 'ONE_OFFER_LOCK', 'DREAM_EXCEPTION');

-- CreateEnum
CREATE TYPE "PlacementDriveType" AS ENUM ('PLACEMENT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "PlacementDriveInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PlacementDriveInviteDirection" AS ENUM ('COMPANY_TO_COLLEGE', 'COLLEGE_TO_COMPANY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('COLLEGE', 'COMPANY', 'GENERAL');

-- CreateEnum
CREATE TYPE "RSVPStatus" AS ENUM ('GOING', 'MAYBE', 'DECLINED');

-- AlterEnum
ALTER TYPE "CollegeRequestStatus" ADD VALUE 'VERIFIED';

-- AlterEnum
ALTER TYPE "CommunityMemberRole" ADD VALUE 'ALUMNI';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PLACEMENT_DRIVE_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'PLACEMENT_DRIVE_APPLIED';

-- DropIndex
DROP INDEX "Department_collegeId_name_idx";

-- AlterTable
ALTER TABLE "College" ADD COLUMN     "allowBacklogsUpTo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "masterAdminUserId" TEXT,
ADD COLUMN     "offerPolicy" "CollegeOfferPolicy" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "tpoUserId" TEXT;

-- AlterTable
ALTER TABLE "CollegeRequest" ADD COLUMN     "aisheCode" TEXT,
ADD COLUMN     "authorityLetterheadDoc" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankIfscCode" TEXT,
ADD COLUMN     "officialEmail" TEXT;

-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "cin" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "discoveredVia" TEXT,
ADD COLUMN     "emailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "verificationDoc" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "CompanyRequest" ADD COLUMN     "businessEmail" TEXT,
ADD COLUMN     "corporateDoc" TEXT,
ADD COLUMN     "requestType" "BusinessRequestType" NOT NULL DEFAULT 'RECRUITER_ONBOARDING';

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "hodUserId" TEXT,
ADD COLUMN     "standardDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "alumniVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alumniVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "backlogs" INTEGER DEFAULT 0,
ADD COLUMN     "cgpa" DOUBLE PRECISION,
ADD COLUMN     "collegeEmail" TEXT,
ADD COLUMN     "collegeEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentYear" INTEGER,
ADD COLUMN     "isAlumni" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Hackathon" ADD COLUMN     "minTeamSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "atsSource" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "ppoOffered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSkill" ADD COLUMN     "verificationProof" JSONB,
ADD COLUMN     "verificationSource" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CdcrMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" TEXT,

    CONSTRAINT "CdcrMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "capacity" INTEGER,
    "type" "EventType" NOT NULL DEFAULT 'GENERAL',
    "collegeId" TEXT,
    "companyId" TEXT,
    "communityId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRSVP" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],

    CONSTRAINT "StandardDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJobApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogoUrl" TEXT,
    "applyUrl" TEXT,
    "location" TEXT,
    "jobType" TEXT,
    "status" "ExternalAppStatus" NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalJobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDrive" (
    "id" TEXT NOT NULL,
    "driveTitle" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetCollegeId" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "driveDate" TIMESTAMP(3),
    "applyDeadline" TIMESTAMP(3),
    "status" "PlacementDriveStatus" NOT NULL DEFAULT 'UPCOMING',
    "driveType" "PlacementDriveType" NOT NULL DEFAULT 'PLACEMENT',
    "roles" TEXT[],
    "stipendMin" INTEGER,
    "stipendMax" INTEGER,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT DEFAULT 'INR',
    "internshipDurationMonths" INTEGER,
    "minCgpa" DOUBLE PRECISION,
    "maxBacklogs" INTEGER,
    "eligibleBranches" TEXT[],
    "eligibleYears" INTEGER[],
    "isDreamCompany" BOOLEAN NOT NULL DEFAULT false,
    "ppoOffered" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDriveApplication" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" "PlacementDriveApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementDriveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDriveInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "initiatedBy" "PlacementDriveInviteDirection" NOT NULL DEFAULT 'COMPANY_TO_COLLEGE',
    "driveTitle" TEXT NOT NULL,
    "driveDate" TIMESTAMP(3),
    "applyDeadline" TIMESTAMP(3),
    "roles" TEXT[],
    "stipendMin" INTEGER,
    "stipendMax" INTEGER,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT DEFAULT 'INR',
    "minCgpa" DOUBLE PRECISION,
    "eligibleBranches" TEXT[],
    "eligibleYears" INTEGER[],
    "description" TEXT,
    "message" TEXT,
    "status" "PlacementDriveInviteStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "placementDriveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementDriveInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDriveRound" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "venue" TEXT,
    "meetLink" TEXT,
    "durationMin" INTEGER,
    "maxSlots" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementDriveRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDriveRoundShortlist" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "advancedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementDriveRoundShortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOffice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "CompanyOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDepartment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "CompanyDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompanyFollowers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyFollowers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "CdcrMember_collegeId_idx" ON "CdcrMember"("collegeId");

-- CreateIndex
CREATE INDEX "CdcrMember_userId_idx" ON "CdcrMember"("userId");

-- CreateIndex
CREATE INDEX "CdcrMember_departmentId_idx" ON "CdcrMember"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CdcrMember_userId_collegeId_departmentId_key" ON "CdcrMember"("userId", "collegeId", "departmentId");

-- CreateIndex
CREATE INDEX "Event_collegeId_idx" ON "Event"("collegeId");

-- CreateIndex
CREATE INDEX "Event_companyId_idx" ON "Event"("companyId");

-- CreateIndex
CREATE INDEX "Event_communityId_idx" ON "Event"("communityId");

-- CreateIndex
CREATE INDEX "Event_collegeId_type_idx" ON "Event"("collegeId", "type");

-- CreateIndex
CREATE INDEX "Event_companyId_type_idx" ON "Event"("companyId", "type");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "EventRSVP_eventId_userId_key" ON "EventRSVP"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StandardDepartment_name_key" ON "StandardDepartment"("name");

-- CreateIndex
CREATE INDEX "ExternalJobApplication_userId_idx" ON "ExternalJobApplication"("userId");

-- CreateIndex
CREATE INDEX "ExternalJobApplication_jobId_idx" ON "ExternalJobApplication"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJobApplication_id_userId_key" ON "ExternalJobApplication"("id", "userId");

-- CreateIndex
CREATE INDEX "PlacementDrive_targetCollegeId_idx" ON "PlacementDrive"("targetCollegeId");

-- CreateIndex
CREATE INDEX "PlacementDrive_companyId_idx" ON "PlacementDrive"("companyId");

-- CreateIndex
CREATE INDEX "PlacementDrive_status_idx" ON "PlacementDrive"("status");

-- CreateIndex
CREATE INDEX "PlacementDrive_driveType_idx" ON "PlacementDrive"("driveType");

-- CreateIndex
CREATE INDEX "PlacementDriveApplication_userId_idx" ON "PlacementDriveApplication"("userId");

-- CreateIndex
CREATE INDEX "PlacementDriveApplication_driveId_idx" ON "PlacementDriveApplication"("driveId");

-- CreateIndex
CREATE INDEX "PlacementDriveApplication_status_idx" ON "PlacementDriveApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementDriveApplication_driveId_userId_key" ON "PlacementDriveApplication"("driveId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementDriveInvite_placementDriveId_key" ON "PlacementDriveInvite"("placementDriveId");

-- CreateIndex
CREATE INDEX "PlacementDriveInvite_companyId_idx" ON "PlacementDriveInvite"("companyId");

-- CreateIndex
CREATE INDEX "PlacementDriveInvite_collegeId_idx" ON "PlacementDriveInvite"("collegeId");

-- CreateIndex
CREATE INDEX "PlacementDriveInvite_status_idx" ON "PlacementDriveInvite"("status");

-- CreateIndex
CREATE INDEX "PlacementDriveRound_driveId_idx" ON "PlacementDriveRound"("driveId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementDriveRoundShortlist_roundId_applicationId_key" ON "PlacementDriveRoundShortlist"("roundId", "applicationId");

-- CreateIndex
CREATE INDEX "_CompanyFollowers_B_index" ON "_CompanyFollowers"("B");

-- CreateIndex
CREATE INDEX "College_masterAdminUserId_idx" ON "College"("masterAdminUserId");

-- CreateIndex
CREATE INDEX "CollegeRequest_aisheCode_idx" ON "CollegeRequest"("aisheCode");

-- CreateIndex
CREATE INDEX "CollegeRequest_bankAccountNumber_idx" ON "CollegeRequest"("bankAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_gstin_key" ON "Company"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cin_key" ON "Company"("cin");

-- CreateIndex
CREATE INDEX "Department_standardDepartmentId_idx" ON "Department"("standardDepartmentId");

-- CreateIndex
CREATE INDEX "Department_hodUserId_idx" ON "Department"("hodUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_collegeId_name_key" ON "Department"("collegeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_collegeId_standardDepartmentId_key" ON "Department"("collegeId", "standardDepartmentId");

-- CreateIndex
CREATE INDEX "Hackathon_trendingScore_idx" ON "Hackathon"("trendingScore");

-- CreateIndex
CREATE INDEX "Hackathon_createdAt_idx" ON "Hackathon"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hackathon_sourceId_sourcePlatform_key" ON "Hackathon"("sourceId", "sourcePlatform");

-- CreateIndex
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");

-- CreateIndex
CREATE INDEX "Job_type_status_idx" ON "Job"("type", "status");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_status_idx" ON "JobApplication"("jobId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_applicantId_idx" ON "JobApplication"("applicantId");

-- CreateIndex
CREATE INDEX "MentorshipRequest_requesterId_idx" ON "MentorshipRequest"("requesterId");

-- CreateIndex
CREATE INDEX "MentorshipRequest_mentorId_status_idx" ON "MentorshipRequest"("mentorId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_archived_idx" ON "Notification"("userId", "archived");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_masterAdminUserId_fkey" FOREIGN KEY ("masterAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_tpoUserId_fkey" FOREIGN KEY ("tpoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hodUserId_fkey" FOREIGN KEY ("hodUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_standardDepartmentId_fkey" FOREIGN KEY ("standardDepartmentId") REFERENCES "StandardDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdcrMember" ADD CONSTRAINT "CdcrMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdcrMember" ADD CONSTRAINT "CdcrMember_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdcrMember" ADD CONSTRAINT "CdcrMember_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CdcrMember" ADD CONSTRAINT "CdcrMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobApplication" ADD CONSTRAINT "ExternalJobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobApplication" ADD CONSTRAINT "ExternalJobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDrive" ADD CONSTRAINT "PlacementDrive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDrive" ADD CONSTRAINT "PlacementDrive_targetCollegeId_fkey" FOREIGN KEY ("targetCollegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDrive" ADD CONSTRAINT "PlacementDrive_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveApplication" ADD CONSTRAINT "PlacementDriveApplication_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "PlacementDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveApplication" ADD CONSTRAINT "PlacementDriveApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveInvite" ADD CONSTRAINT "PlacementDriveInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveInvite" ADD CONSTRAINT "PlacementDriveInvite_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveInvite" ADD CONSTRAINT "PlacementDriveInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveInvite" ADD CONSTRAINT "PlacementDriveInvite_placementDriveId_fkey" FOREIGN KEY ("placementDriveId") REFERENCES "PlacementDrive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveRound" ADD CONSTRAINT "PlacementDriveRound_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "PlacementDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveRoundShortlist" ADD CONSTRAINT "PlacementDriveRoundShortlist_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PlacementDriveRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDriveRoundShortlist" ADD CONSTRAINT "PlacementDriveRoundShortlist_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PlacementDriveApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOffice" ADD CONSTRAINT "CompanyOffice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDepartment" ADD CONSTRAINT "CompanyDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyFollowers" ADD CONSTRAINT "_CompanyFollowers_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyFollowers" ADD CONSTRAINT "_CompanyFollowers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
