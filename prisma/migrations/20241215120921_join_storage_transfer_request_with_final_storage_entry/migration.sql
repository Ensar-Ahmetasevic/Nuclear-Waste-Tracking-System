-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_approvedByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_requestedByEmployeeId_fkey";

-- AlterTable
ALTER TABLE "StorageTransferRequest" ADD COLUMN     "finalStorageEntryId" INTEGER;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_finalStorageEntryId_fkey" FOREIGN KEY ("finalStorageEntryId") REFERENCES "FinalStorageEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
