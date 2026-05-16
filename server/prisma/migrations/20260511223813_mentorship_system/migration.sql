-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "MentorshipRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "message" TEXT,
    "goals" TEXT,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
