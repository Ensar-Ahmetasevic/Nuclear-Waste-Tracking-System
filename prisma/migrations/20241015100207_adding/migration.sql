/*
  Warnings:

  - You are about to drop the column `responsibleEmployeePreStorageId` on the `PreStorageEntry` table. All the data in the column will be lost.
  - You are about to drop the `ResponsibleEmployeePreStorage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResponsibleEmployeeStorage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StorageConditions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StorageLocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StorageOfWaste` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StorageType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PreStorageConditions" DROP CONSTRAINT "PreStorageConditions_preStorageResponsibleEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "PreStorageEntry" DROP CONSTRAINT "PreStorageEntry_responsibleEmployeePreStorageId_fkey";

-- DropForeignKey
ALTER TABLE "StorageOfWaste" DROP CONSTRAINT "StorageOfWaste_responsibleEmployeeStorageId_fkey";

-- DropForeignKey
ALTER TABLE "StorageOfWaste" DROP CONSTRAINT "StorageOfWaste_storageLocationId_fkey";

-- DropForeignKey
ALTER TABLE "StorageOfWaste" DROP CONSTRAINT "StorageOfWaste_storageTypeId_fkey";

-- AlterTable
ALTER TABLE "PreStorageEntry" DROP COLUMN "responsibleEmployeePreStorageId",
ADD COLUMN     "responsiblePreStorageEmployeeId" INTEGER;

-- AlterTable
ALTER TABLE "ShippingInformation" ADD COLUMN     "truckStatus" TEXT NOT NULL DEFAULT 'IN',
ALTER COLUMN "status" SET DEFAULT 'in transport';

-- DropTable
DROP TABLE "ResponsibleEmployeePreStorage";

-- DropTable
DROP TABLE "ResponsibleEmployeeStorage";

-- DropTable
DROP TABLE "StorageConditions";

-- DropTable
DROP TABLE "StorageLocation";

-- DropTable
DROP TABLE "StorageOfWaste";

-- DropTable
DROP TABLE "StorageType";

-- CreateTable
CREATE TABLE "PreStorageResponsibleEmployee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "safetyTraining" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PreStorageResponsibleEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalStorageEntry" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "FinalStorageTypeId" INTEGER NOT NULL,
    "FinalStorageLocationId" INTEGER NOT NULL,
    "finalStorageEmployeeId" INTEGER NOT NULL,

    CONSTRAINT "FinalStorageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalStorageType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surfaceArea" INTEGER NOT NULL,
    "storageFor" TEXT NOT NULL,

    CONSTRAINT "FinalStorageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalStorageLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "delepth" INTEGER NOT NULL,
    "roomName" TEXT NOT NULL,

    CONSTRAINT "FinalStorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalStorageResponsibleEmployee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "dateOfBirth" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "safetyTraining" BOOLEAN NOT NULL,

    CONSTRAINT "FinalStorageResponsibleEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalStorageConditions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageTemperature" DOUBLE PRECISION NOT NULL,
    "storageRadiationLevel" DOUBLE PRECISION NOT NULL,
    "storageHumidity" DOUBLE PRECISION NOT NULL,
    "storagePressure" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FinalStorageConditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinalStorageEntry_FinalStorageTypeId_key" ON "FinalStorageEntry"("FinalStorageTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalStorageEntry_FinalStorageLocationId_key" ON "FinalStorageEntry"("FinalStorageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalStorageEntry_finalStorageEmployeeId_key" ON "FinalStorageEntry"("finalStorageEmployeeId");

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_responsiblePreStorageEmployeeId_fkey" FOREIGN KEY ("responsiblePreStorageEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_preStorageResponsibleEmployeeId_fkey" FOREIGN KEY ("preStorageResponsibleEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageEntry" ADD CONSTRAINT "FinalStorageEntry_FinalStorageTypeId_fkey" FOREIGN KEY ("FinalStorageTypeId") REFERENCES "FinalStorageType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageEntry" ADD CONSTRAINT "FinalStorageEntry_FinalStorageLocationId_fkey" FOREIGN KEY ("FinalStorageLocationId") REFERENCES "FinalStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageEntry" ADD CONSTRAINT "FinalStorageEntry_finalStorageEmployeeId_fkey" FOREIGN KEY ("finalStorageEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
