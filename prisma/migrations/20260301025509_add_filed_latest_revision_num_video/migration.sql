/*
  Warnings:

  - A unique constraint covering the columns `[id,latestRevisionNum]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "latestRevisionNum" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Video_id_latestRevisionNum_key" ON "Video"("id", "latestRevisionNum");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_id_latestRevisionNum_fkey" FOREIGN KEY ("id", "latestRevisionNum") REFERENCES "VideoRevision"("videoId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;
