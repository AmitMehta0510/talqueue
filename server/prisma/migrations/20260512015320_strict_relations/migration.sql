/*
  Warnings:

  - You are about to drop the column `jobId` on the `ReferralRequest` table. All the data in the column will be lost.
  - Made the column `companyId` on table `Experience` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `ReferralRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ReferralRequest" DROP CONSTRAINT "ReferralRequest_jobId_fkey";

-- AlterTable
ALTER TABLE "Experience" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ReferralRequest" DROP COLUMN "jobId",
ADD COLUMN     "externalJobId" TEXT,
ADD COLUMN     "internalJobId" TEXT,
ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_internalJobId_fkey" FOREIGN KEY ("internalJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
