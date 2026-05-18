-- CreateEnum
CREATE TYPE "CommunityCategory" AS ENUM ('GENERAL', 'PLACEMENTS', 'REFERRALS', 'INTERVIEWS', 'SALARIES', 'ANNOUNCEMENTS', 'RESOURCES', 'EVENTS');

-- AlterTable
ALTER TABLE "CompanyCommunityMembership" ADD COLUMN     "communityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "category" "CommunityCategory";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "announcement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resourceType" TEXT,
ADD COLUMN     "resourceUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_companyCommunityId_fkey" FOREIGN KEY ("companyCommunityId") REFERENCES "CompanyCommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
