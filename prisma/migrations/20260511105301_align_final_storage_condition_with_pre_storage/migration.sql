/*
  Warnings:

  - You are about to drop the column `storageHumidity` on the `FinalStorageCondition` table. All the data in the column will be lost.
  - You are about to drop the column `storagePressure` on the `FinalStorageCondition` table. All the data in the column will be lost.
  - You are about to drop the column `storageRadiationLevel` on the `FinalStorageCondition` table. All the data in the column will be lost.
  - You are about to drop the column `storageTemperature` on the `FinalStorageCondition` table. All the data in the column will be lost.
  - Added the required column `finalStorageHumidity` to the `FinalStorageCondition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalStoragePressure` to the `FinalStorageCondition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalStorageRadiationLevel` to the `FinalStorageCondition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalStorageTemperature` to the `FinalStorageCondition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FinalStorageCondition" DROP COLUMN "storageHumidity",
DROP COLUMN "storagePressure",
DROP COLUMN "storageRadiationLevel",
DROP COLUMN "storageTemperature",
ADD COLUMN     "finalStorageHumidity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "finalStoragePressure" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "finalStorageRadiationLevel" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "finalStorageResponsibleEmployeeId" INTEGER,
ADD COLUMN     "finalStorageTemperature" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "FinalStorageCondition" ADD CONSTRAINT "FinalStorageCondition_finalStorageResponsibleEmployeeId_fkey" FOREIGN KEY ("finalStorageResponsibleEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
