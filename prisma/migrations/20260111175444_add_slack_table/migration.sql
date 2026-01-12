/*
  Warnings:

  - You are about to drop the column `slackTs` on the `VideoComment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VideoComment" DROP COLUMN "slackTs";

-- CreateTable
CREATE TABLE "SlackMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ts" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoCommentId" TEXT,

    CONSTRAINT "SlackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackThreadMessage" (
    "id" TEXT NOT NULL,
    "slackMessageId" TEXT NOT NULL,
    "ts" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackMessage_videoCommentId_key" ON "SlackMessage"("videoCommentId");

-- AddForeignKey
ALTER TABLE "SlackMessage" ADD CONSTRAINT "SlackMessage_videoCommentId_fkey" FOREIGN KEY ("videoCommentId") REFERENCES "VideoComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackThreadMessage" ADD CONSTRAINT "SlackThreadMessage_slackMessageId_fkey" FOREIGN KEY ("slackMessageId") REFERENCES "SlackMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
