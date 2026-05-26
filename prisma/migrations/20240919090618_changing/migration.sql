/*
  Warnings:

  - You are about to drop the column `preStorageTypeId` on the `PreStorageOfWaste` table. All the data in the column will be lost.
  - You are about to drop the `PreStorageType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `preStorageLocationId` to the `PreStorageOfWaste` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PreStorageOfWaste" DROP CONSTRAINT "PreStorageOfWaste_preStorageTypeId_fkey";

-- AlterTable
ALTER TABLE "PreStorageOfWaste" DROP COLUMN "preStorageTypeId",
ADD COLUMN     "preStorageLocationId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PreStorageType";

-- CreateTable
CREATE TABLE "PreStorageLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surfaceArea" DOUBLE PRECISION NOT NULL,
    "preStorageFor" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "wasteProfile" TEXT NOT NULL,

    CONSTRAINT "PreStorageLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PreStorageOfWaste" ADD CONSTRAINT "PreStorageOfWaste_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
