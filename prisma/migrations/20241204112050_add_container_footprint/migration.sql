/*
  Warnings:

  - Added the required column `containerFootprint` to the `FinalStorageLocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FinalStorageLocation" ADD COLUMN     "containerFootprint" INTEGER NOT NULL;
