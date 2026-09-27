-- Documented links for earlier receipts and administrator-approved stock corrections.
-- Existing allocations keep their values; nothing is linked or corrected by this migration.
-- AlterTable
ALTER TABLE "ReceiptAllocation" ADD COLUMN     "legacyLinkId" INTEGER,
ALTER COLUMN "responsibleEmployeeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LegacyReceiptLink" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "receiptQuantity" INTEGER NOT NULL,
    "receiptCreatedAt" TIMESTAMP(3) NOT NULL,
    "profiles" JSONB NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyReceiptLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCorrection" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "area" "StorageArea" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "verificationId" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "before" JSONB NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacyReceiptLink_receiptId_key" ON "LegacyReceiptLink"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyReceiptLink_actionKey_key" ON "LegacyReceiptLink"("actionKey");

-- CreateIndex
CREATE INDEX "LegacyReceiptLink_organizationId_locationId_idx" ON "LegacyReceiptLink"("organizationId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockCorrection_verificationId_key" ON "StockCorrection"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockCorrection_actionKey_key" ON "StockCorrection"("actionKey");

-- CreateIndex
CREATE INDEX "StockCorrection_organizationId_area_locationId_idx" ON "StockCorrection"("organizationId", "area", "locationId");

-- AddForeignKey
ALTER TABLE "LegacyReceiptLink" ADD CONSTRAINT "LegacyReceiptLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

