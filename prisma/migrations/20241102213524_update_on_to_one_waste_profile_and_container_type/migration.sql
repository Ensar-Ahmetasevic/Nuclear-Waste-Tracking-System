/*
  Warnings:

  - You are about to drop the column `containerTypeId` on the `ContainerProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[containerTypeId]` on the table `WasteProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ContainerProfile" DROP CONSTRAINT "ContainerProfile_containerTypeId_fkey";

-- AlterTable
ALTER TABLE "ContainerProfile" DROP COLUMN "containerTypeId";

-- AlterTable
ALTER TABLE "WasteProfile" ADD COLUMN     "containerTypeId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "WasteProfile_containerTypeId_key" ON "WasteProfile"("containerTypeId");

-- AddForeignKey
ALTER TABLE "WasteProfile" ADD CONSTRAINT "WasteProfile_containerTypeId_fkey" FOREIGN KEY ("containerTypeId") REFERENCES "ContainerType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
