-- Recorded hall verifications (physical count or documentary check) kept beside recorded stock.
-- Nothing existing is changed and no verification is assumed for earlier data.
-- CreateEnum
CREATE TYPE "StorageArea" AS ENUM ('PRE_STORAGE', 'FINAL_STORAGE');

-- CreateTable
CREATE TABLE "StockVerification" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "area" "StorageArea" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "recordedQuantity" INTEGER NOT NULL,
    "recorded" JSONB NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockVerification_actionKey_key" ON "StockVerification"("actionKey");

-- CreateIndex
CREATE INDEX "StockVerification_organizationId_area_locationId_idx" ON "StockVerification"("organizationId", "area", "locationId");

-- AddForeignKey
ALTER TABLE "StockVerification" ADD CONSTRAINT "StockVerification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

