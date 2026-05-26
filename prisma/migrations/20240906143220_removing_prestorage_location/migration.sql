/*
  Warnings:

  - You are about to drop the column `preStorageLocationId` on the `PreStorageOfWaste` table. All the data in the column will be lost.
  - You are about to drop the `PreStorageLocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PreStorageOfWaste" DROP CONSTRAINT "PreStorageOfWaste_preStorageLocationId_fkey";

-- DropIndex
DROP INDEX "PreStorageOfWaste_preStorageLocationId_key";

-- AlterTable
ALTER TABLE "PreStorageOfWaste" DROP COLUMN "preStorageLocationId";

-- DropTable
DROP TABLE "PreStorageLocation";
