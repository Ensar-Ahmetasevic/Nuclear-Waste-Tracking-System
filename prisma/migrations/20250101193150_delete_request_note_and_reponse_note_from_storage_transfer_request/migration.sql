/*
  Warnings:

  - You are about to drop the column `requestNote` on the `StorageTransferRequest` table. All the data in the column will be lost.
  - You are about to drop the column `responseNote` on the `StorageTransferRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StorageTransferRequest" DROP COLUMN "requestNote",
DROP COLUMN "responseNote";
