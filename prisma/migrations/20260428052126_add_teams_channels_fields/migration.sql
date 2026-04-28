-- AlterTable
ALTER TABLE "channel" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "channel_member" ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;
