/*
  Warnings:

  - You are about to drop the `ApiToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ApiToken";

-- CreateTable
CREATE TABLE "SystemSecret" (
    "key" TEXT NOT NULL,
    "valueHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSecret_pkey" PRIMARY KEY ("key")
);
