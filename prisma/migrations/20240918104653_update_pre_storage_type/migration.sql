/*
  Warnings:

  - Added the required column `containerType` to the `PreStorageType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wasteProfile` to the `PreStorageType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PreStorageType" ADD COLUMN     "containerType" TEXT NOT NULL,
ADD COLUMN     "wasteProfile" TEXT NOT NULL;
