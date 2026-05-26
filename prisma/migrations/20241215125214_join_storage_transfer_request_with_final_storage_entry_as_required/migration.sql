/*
  Warnings:

  - Made the column `finalStorageEntryId` on table `StorageTransferRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StorageTransferRequest" ALTER COLUMN "finalStorageEntryId" SET NOT NULL;
