-- A responsible person who no longer works here can be deactivated for new records.
-- Existing receipts, measurements and transfers keep their reference; nobody is deactivated by this migration.
-- AlterTable
ALTER TABLE "PreStorageResponsibleEmployee" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FinalStorageResponsibleEmployee" ADD COLUMN     "archivedAt" TIMESTAMP(3);

