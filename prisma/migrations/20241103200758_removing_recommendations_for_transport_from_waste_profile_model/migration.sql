/*
  Warnings:

  - Made the column `containerTypeId` on table `WasteProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "WasteProfile" ALTER COLUMN "containerTypeId" SET NOT NULL;
