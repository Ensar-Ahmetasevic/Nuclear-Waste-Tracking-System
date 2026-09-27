-- Halls and responsible persons must never cascade-delete receipts, measurements or transfers.
-- No existing rows are changed; the change history also covers storage configuration.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DefinitionKind" ADD VALUE 'PRE_STORAGE_LOCATION';
ALTER TYPE "DefinitionKind" ADD VALUE 'FINAL_STORAGE_LOCATION';
ALTER TYPE "DefinitionKind" ADD VALUE 'PRE_STORAGE_EMPLOYEE';
ALTER TYPE "DefinitionKind" ADD VALUE 'FINAL_STORAGE_EMPLOYEE';

-- DropForeignKey
ALTER TABLE "PreStorageEntry" DROP CONSTRAINT "PreStorageEntry_preStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "PreStorageEntry" DROP CONSTRAINT "PreStorageEntry_responsiblePreStorageEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "PreStorageConditions" DROP CONSTRAINT "PreStorageConditions_preStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "PreStorageConditions" DROP CONSTRAINT "PreStorageConditions_preStorageResponsibleEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_requestedByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_approvedByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_acceptedByEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "StorageTransferRequest" DROP CONSTRAINT "StorageTransferRequest_finalStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "FinalStorageCondition" DROP CONSTRAINT "FinalStorageCondition_finalStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "FinalStorageCondition" DROP CONSTRAINT "FinalStorageCondition_finalStorageResponsibleEmployeeId_fkey";

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_responsiblePreStorageEmployeeId_fkey" FOREIGN KEY ("responsiblePreStorageEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_preStorageResponsibleEmployeeId_fkey" FOREIGN KEY ("preStorageResponsibleEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_acceptedByEmployeeId_fkey" FOREIGN KEY ("acceptedByEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_finalStorageLocationId_fkey" FOREIGN KEY ("finalStorageLocationId") REFERENCES "FinalStorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageCondition" ADD CONSTRAINT "FinalStorageCondition_finalStorageLocationId_fkey" FOREIGN KEY ("finalStorageLocationId") REFERENCES "FinalStorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageCondition" ADD CONSTRAINT "FinalStorageCondition_finalStorageResponsibleEmployeeId_fkey" FOREIGN KEY ("finalStorageResponsibleEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

