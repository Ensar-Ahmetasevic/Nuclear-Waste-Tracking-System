-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "ShippingInformation" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "ContainerProfile" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "LocationOrigin" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "WasteProfile" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "ContainerType" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "PreStorageLocation" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "PreStorageEntry" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "PreStorageResponsibleEmployee" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "PreStorageConditions" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "FinalStorageLocation" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "StorageTransferRequest" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "FinalStorageResponsibleEmployee" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "FinalStorageCondition" ADD COLUMN     "organizationId" INTEGER;

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "UserProfile_organizationId_idx" ON "UserProfile"("organizationId");

-- CreateIndex
CREATE INDEX "ShippingInformation_organizationId_idx" ON "ShippingInformation"("organizationId");

-- CreateIndex
CREATE INDEX "ContainerProfile_organizationId_idx" ON "ContainerProfile"("organizationId");

-- CreateIndex
CREATE INDEX "LocationOrigin_organizationId_idx" ON "LocationOrigin"("organizationId");

-- CreateIndex
CREATE INDEX "WasteProfile_organizationId_idx" ON "WasteProfile"("organizationId");

-- CreateIndex
CREATE INDEX "ContainerType_organizationId_idx" ON "ContainerType"("organizationId");

-- CreateIndex
CREATE INDEX "PreStorageLocation_organizationId_idx" ON "PreStorageLocation"("organizationId");

-- CreateIndex
CREATE INDEX "PreStorageEntry_organizationId_idx" ON "PreStorageEntry"("organizationId");

-- CreateIndex
CREATE INDEX "PreStorageResponsibleEmployee_organizationId_idx" ON "PreStorageResponsibleEmployee"("organizationId");

-- CreateIndex
CREATE INDEX "PreStorageConditions_organizationId_idx" ON "PreStorageConditions"("organizationId");

-- CreateIndex
CREATE INDEX "FinalStorageLocation_organizationId_idx" ON "FinalStorageLocation"("organizationId");

-- CreateIndex
CREATE INDEX "StorageTransferRequest_organizationId_idx" ON "StorageTransferRequest"("organizationId");

-- CreateIndex
CREATE INDEX "FinalStorageResponsibleEmployee_organizationId_idx" ON "FinalStorageResponsibleEmployee"("organizationId");

-- CreateIndex
CREATE INDEX "FinalStorageCondition_organizationId_idx" ON "FinalStorageCondition"("organizationId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingInformation" ADD CONSTRAINT "ShippingInformation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationOrigin" ADD CONSTRAINT "LocationOrigin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteProfile" ADD CONSTRAINT "WasteProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerType" ADD CONSTRAINT "ContainerType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageLocation" ADD CONSTRAINT "PreStorageLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageEntry" ADD CONSTRAINT "PreStorageEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageResponsibleEmployee" ADD CONSTRAINT "PreStorageResponsibleEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageConditions" ADD CONSTRAINT "PreStorageConditions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageLocation" ADD CONSTRAINT "FinalStorageLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageResponsibleEmployee" ADD CONSTRAINT "FinalStorageResponsibleEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalStorageCondition" ADD CONSTRAINT "FinalStorageCondition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

