/*
  Warnings:

  - You are about to drop the `PreStorageOfWaste` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `preStorageLocationId` to the `PreStorageConditions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PreStorageOfWaste" DROP CONSTRAINT "PreStorageOfWaste_preStorageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "PreStorageOfWaste" DROP CONSTRAINT "PreStorageOfWaste_responsibleEmployeePreStorageId_fkey";

-- AlterTable
ALTER TABLE "PreStorageConditions" ADD COLUMN     "preStorageLocationId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PreStorageOfWaste";

-- CreateTable
CREATE TABLE "PreStorageEntry" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "preStorageLocationId" INTEGER NOT NULL,
    "responsibleEmployeePreStorageId" INTEGER NOT NULL,

    CONSTRAINT "PreStorageEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_responsibleEmployeePreStorageId_fkey" FOREIGN KEY ("responsibleEmployeePreStorageId") REFERENCES "ResponsibleEmployeePreStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
