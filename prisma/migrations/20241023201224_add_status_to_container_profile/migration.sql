/*
  Warnings:

  - You are about to drop the column `status` on the `ContainerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContainerProfile" DROP COLUMN "status",
ADD COLUMN     "containerStatus" TEXT NOT NULL DEFAULT 'pending';
