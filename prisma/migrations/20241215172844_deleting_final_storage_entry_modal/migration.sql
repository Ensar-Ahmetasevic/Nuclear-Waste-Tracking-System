/*
  Warnings:

  - You are about to drop the column `finalStorageEntryId` on the `StorageTransferRequest` table. All the data in the column will be lost.
  - You are about to drop the `FinalStorageEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FinalStorageEntry" DROP CONSTRAINT "FinalStorageEntry_FinalStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "FinalStorageEntry" DROP CONSTRAINT "FinalStorageEntry_finalStorageEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_finalStorageEntryId_fkey";

-- AlterTable
ALTER TABLE "FinalStorageLocation" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StorageTransferRequest" DROP COLUMN "finalStorageEntryId",
ADD COLUMN     "acceptedByEmployeeId" INTEGER,
ADD COLUMN     "finalStorageLocationId" INTEGER;

-- DropTable
DROP TABLE "FinalStorageEntry";

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_acceptedByEmployeeId_fkey" FOREIGN KEY ("acceptedByEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_finalStorageLocationId_fkey" FOREIGN KEY ("finalStorageLocationId") REFERENCES "FinalStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
