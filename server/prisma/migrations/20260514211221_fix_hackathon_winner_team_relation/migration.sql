/*
  Warnings:

  - You are about to drop the column `rank` on the `HackathonWinner` table. All the data in the column will be lost.
  - You are about to drop the column `rewardPoints` on the `HackathonWinner` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `HackathonWinner` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hackathonId,position]` on the table `HackathonWinner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[submissionId]` on the table `HackathonWinner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `position` to the `HackathonWinner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `HackathonWinner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `HackathonWinner` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HackathonWinner_hackathonId_rank_key";

-- AlterTable
ALTER TABLE "HackathonWinner" DROP COLUMN "rank",
DROP COLUMN "rewardPoints",
DROP COLUMN "title",
ADD COLUMN     "position" INTEGER NOT NULL,
ADD COLUMN     "score" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "teamId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "HackathonWinner_hackathonId_position_key" ON "HackathonWinner"("hackathonId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "HackathonWinner_submissionId_key" ON "HackathonWinner"("submissionId");

-- AddForeignKey
ALTER TABLE "HackathonWinner" ADD CONSTRAINT "HackathonWinner_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
