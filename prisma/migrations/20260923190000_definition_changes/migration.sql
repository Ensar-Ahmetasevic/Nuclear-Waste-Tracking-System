-- Definitions can be archived instead of rewritten; every administrative change is recorded.
-- Existing definitions stay active and no earlier changes are reconstructed.
-- CreateEnum
CREATE TYPE "DefinitionKind" AS ENUM ('LOCATION_ORIGIN', 'WASTE_PROFILE', 'CONTAINER_TYPE');

-- CreateEnum
CREATE TYPE "DefinitionAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'DELETE');

-- AlterTable
ALTER TABLE "LocationOrigin" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WasteProfile" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContainerType" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DefinitionChange" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "definitionType" "DefinitionKind" NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "action" "DefinitionAction" NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefinitionChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefinitionChange_actionKey_key" ON "DefinitionChange"("actionKey");

-- CreateIndex
CREATE INDEX "DefinitionChange_organizationId_definitionType_definitionId_idx" ON "DefinitionChange"("organizationId", "definitionType", "definitionId");

-- CreateIndex
CREATE INDEX "DefinitionChange_organizationId_createdAt_idx" ON "DefinitionChange"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "DefinitionChange" ADD CONSTRAINT "DefinitionChange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

