/*
  Warnings:

  - You are about to drop the column `notes` on the `StorageTransferRequest` table. All the data in the column will be lost.
  - You are about to drop the column `responseNotes` on the `StorageTransferRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StorageTransferRequest" DROP COLUMN "notes",
DROP COLUMN "responseNotes",
ADD COLUMN     "requestNote" TEXT,
ADD COLUMN     "responseNote" TEXT;
