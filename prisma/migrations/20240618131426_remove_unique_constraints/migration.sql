/*
  Warnings:

  - Made the column `shippingInformationId` on table `ContainerProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ContainerProfile_containerTypeId_key";

-- DropIndex
DROP INDEX "ContainerProfile_locationOriginId_key";

-- DropIndex
DROP INDEX "ContainerProfile_shippingInformationId_key";

-- DropIndex
DROP INDEX "ContainerProfile_wasteProfileId_key";

-- AlterTable
ALTER TABLE "ContainerProfile" ALTER COLUMN "shippingInformationId" SET NOT NULL;
