-- DropForeignKey
ALTER TABLE "SlackMessage" DROP CONSTRAINT "SlackMessage_videoCommentId_fkey";

-- AlterTable
ALTER TABLE "VideoComment" ADD COLUMN     "notifiedProviders" TEXT[] DEFAULT ARRAY[]::TEXT[];
