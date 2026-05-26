/*
  Warnings:

  - Added the required column `companyName` to the `ShippingInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverName` to the `ShippingInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationPlates` to the `ShippingInformation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShippingInformation" ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "driverName" TEXT NOT NULL,
ADD COLUMN     "registrationPlates" TEXT NOT NULL;
