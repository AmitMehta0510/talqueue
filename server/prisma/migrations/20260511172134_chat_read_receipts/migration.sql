-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readByUsers" TEXT[];
