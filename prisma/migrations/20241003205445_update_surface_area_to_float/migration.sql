/*
  Warnings:

  - Made the column `containerFootprint` on table `PreStorageLocation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PreStorageLocation" ALTER COLUMN "containerFootprint" SET NOT NULL;
