/*
  Warnings:

  - You are about to drop the column `position` on the `ResponsibleEmployeePreStorage` table. All the data in the column will be lost.
  - Added the required column `qualifications` to the `ResponsibleEmployeePreStorage` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `dateOfBirth` on the `ResponsibleEmployeePreStorage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ResponsibleEmployeePreStorage" DROP COLUMN "position",
ADD COLUMN     "qualifications" TEXT NOT NULL,
DROP COLUMN "dateOfBirth",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL;
