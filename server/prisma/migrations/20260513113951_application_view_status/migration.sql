/*
  Warnings:

  - You are about to drop the column `viewed` on the `JobApplication` table. All the data in the column will be lost.
  - You are about to drop the column `viewedAt` on the `JobApplication` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "JobApplicationStatus" ADD VALUE 'VIEWED';

-- AlterTable
ALTER TABLE "JobApplication" DROP COLUMN "viewed",
DROP COLUMN "viewedAt";
