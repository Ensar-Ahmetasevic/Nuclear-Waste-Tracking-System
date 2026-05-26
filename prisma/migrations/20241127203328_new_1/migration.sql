/*
  Warnings:

  - You are about to drop the column `FinalStorageTypeId` on the `FinalStorageEntry` table. All the data in the column will be lost.
  - You are about to drop the column `delepth` on the `FinalStorageLocation` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `FinalStorageLocation` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FinalStorageLocation` table. All the data in the column will be lost.
  - You are about to drop the `FinalStorageConditions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinalStorageType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `containerType` to the `FinalStorageLocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depth` to the `FinalStorageLocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surfaceArea` to the `FinalStorageLocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FinalStorageEntry" DROP CONSTRAINT "FinalStorageEntry_FinalStorageTypeId_fkey";

-- DropIndex
DROP INDEX "FinalStorageEntry_FinalStorageTypeId_key";

-- AlterTable
ALTER TABLE "FinalStorageEntry" DROP COLUMN "FinalStorageTypeId";

-- AlterTable
ALTER TABLE "FinalStorageLocation" DROP COLUMN "delepth",
DROP COLUMN "level",
DROP COLUMN "name",
ADD COLUMN     "containerType" TEXT NOT NULL,
ADD COLUMN     "depth" INTEGER NOT NULL,
ADD COLUMN     "surfaceArea" INTEGER NOT NULL;

-- DropTable
DROP TABLE "FinalStorageConditions";

-- DropTable
DROP TABLE "FinalStorageType";

-- CreateTable
CREATE TABLE "FinalStorageCondition" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageTemperature" DOUBLE PRECISION NOT NULL,
    "storageRadiationLevel" DOUBLE PRECISION NOT NULL,
    "storageHumidity" DOUBLE PRECISION NOT NULL,
    "storagePressure" DOUBLE PRECISION NOT NULL,
    "finalStorageLocationId" INTEGER NOT NULL,

    CONSTRAINT "FinalStorageCondition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinalStorageCondition" ADD CONSTRAINT "FinalStorageCondition_finalStorageLocationId_fkey" FOREIGN KEY ("finalStorageLocationId") REFERENCES "FinalStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
