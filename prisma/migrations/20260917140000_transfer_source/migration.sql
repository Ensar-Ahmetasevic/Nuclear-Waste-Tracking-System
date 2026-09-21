CREATE TABLE "TransferSource" (
 "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "transferId" INTEGER NOT NULL,
 "receiptAllocationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL, "containerProfileId" INTEGER NOT NULL,
 "locationId" INTEGER NOT NULL, "destinationId" INTEGER NOT NULL, "quantity" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'reserved', "approvalActionId" INTEGER NOT NULL, "resolutionActionId" INTEGER,
 CONSTRAINT "TransferSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TransferSource_approvalActionId_key" ON "TransferSource"("approvalActionId");
CREATE UNIQUE INDEX "TransferSource_resolutionActionId_key" ON "TransferSource"("resolutionActionId");
CREATE INDEX "TransferSource_organizationId_receiptAllocationId_idx" ON "TransferSource"("organizationId", "receiptAllocationId");
CREATE INDEX "TransferSource_organizationId_shipmentId_idx" ON "TransferSource"("organizationId", "shipmentId");
ALTER TABLE "TransferSource" ADD CONSTRAINT "TransferSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
