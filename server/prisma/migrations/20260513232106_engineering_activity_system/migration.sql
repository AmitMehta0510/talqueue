-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PROJECT_CREATED', 'PROJECT_JOINED', 'PROJECT_COMPLETED', 'PROJECT_ARCHIVED', 'TEAM_CREATED', 'TEAM_JOINED', 'HACKATHON_CREATED', 'HACKATHON_REGISTERED', 'HACKATHON_SUBMITTED', 'HACKATHON_WON', 'JOB_POSTED', 'JOB_APPLIED', 'JOB_SHORTLISTED', 'JOB_INTERVIEW', 'JOB_HIRED', 'REFERRAL_RECEIVED', 'REFERRAL_GIVEN', 'MENTORSHIP_STARTED', 'REPUTATION_MILESTONE');

-- CreateTable
CREATE TABLE "EngineeringActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineeringActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EngineeringActivity_userId_idx" ON "EngineeringActivity"("userId");

-- CreateIndex
CREATE INDEX "EngineeringActivity_type_idx" ON "EngineeringActivity"("type");

-- CreateIndex
CREATE INDEX "EngineeringActivity_createdAt_idx" ON "EngineeringActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "EngineeringActivity" ADD CONSTRAINT "EngineeringActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
