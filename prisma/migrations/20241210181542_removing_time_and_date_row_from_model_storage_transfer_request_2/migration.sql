/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `StorageTransferRequest` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `StorageTransferRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StorageTransferRequest" DROP COLUMN "approvedAt",
DROP COLUMN "completedAt";
