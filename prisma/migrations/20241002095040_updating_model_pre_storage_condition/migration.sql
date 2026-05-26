/*
  Warnings:

  - Added the required column `preStorageResponsibleEmployeeId` to the `PreStorageConditions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PreStorageConditions" ADD COLUMN     "preStorageResponsibleEmployeeId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_preStorageResponsibleEmployeeId_fkey" FOREIGN KEY ("preStorageResponsibleEmployeeId") REFERENCES "ResponsibleEmployeePreStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
