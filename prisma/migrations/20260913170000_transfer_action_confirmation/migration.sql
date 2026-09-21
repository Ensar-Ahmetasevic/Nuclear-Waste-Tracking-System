ALTER TABLE "StorageTransferRequest" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "TransferAction" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "transferId" INTEGER NOT NULL REFERENCES "StorageTransferRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TransferAction_actionKey_key" ON "TransferAction"("actionKey");
CREATE INDEX "TransferAction_organizationId_transferId_idx" ON "TransferAction"("organizationId", "transferId");
