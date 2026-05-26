/*
  Warnings:

  - You are about to drop the column `roomName` on the `FinalStorageLocation` table. All the data in the column will be lost.
  - Added the required column `name` to the `FinalStorageLocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FinalStorageLocation" DROP COLUMN "roomName",
ADD COLUMN     "name" TEXT NOT NULL;
