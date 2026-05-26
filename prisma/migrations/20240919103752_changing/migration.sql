/*
  Warnings:

  - You are about to alter the column `surfaceArea` on the `PreStorageLocation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "PreStorageLocation" ALTER COLUMN "surfaceArea" SET DATA TYPE INTEGER;
