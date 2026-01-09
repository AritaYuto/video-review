/*
  Warnings:

  - A unique constraint covering the columns `[videoId,revision]` on the table `VideoRevision` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "VideoRevision_videoId_revision_key" ON "VideoRevision"("videoId", "revision");
