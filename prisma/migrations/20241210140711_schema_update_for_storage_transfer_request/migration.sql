/*
  Warnings:

  - You are about to drop the column `status` on the `StorageTransferRequest` table. All the data in the column will be lost.
  - You are about to drop the column `transportStartedAt` on the `StorageTransferRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StorageTransferRequest" DROP COLUMN "status",
DROP COLUMN "transportStartedAt",
ADD COLUMN     "finalStorageStatus" TEXT NOT NULL DEFAULT 'requestPending',
ADD COLUMN     "preStorageStatus" TEXT NOT NULL DEFAULT 'pending';
