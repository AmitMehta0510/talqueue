-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REFERRED');

-- CreateTable
CREATE TABLE "ReferralRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobRole" TEXT NOT NULL,
    "jobId" TEXT,
    "jobUrl" TEXT,
    "message" TEXT,
    "githubUrl" TEXT,
    "codingProfileUrl" TEXT,
    "resumeUrl" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "referredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
