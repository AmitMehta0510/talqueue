/*
  Warnings:

  - Added the required column `createdById` to the `Community` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "FeedItemType" ADD VALUE 'COMMUNITY';

-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;
