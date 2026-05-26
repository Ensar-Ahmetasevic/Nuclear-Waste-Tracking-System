/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ShippingInformation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShippingInformation" DROP COLUMN "createdAt",
ADD COLUMN     "entryDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "exitDateTime" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IN';
