CREATE TABLE "ReceiptAllocation" (
 "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "receiptId" INTEGER NOT NULL,
 "shipmentId" INTEGER NOT NULL, "containerProfileId" INTEGER NOT NULL, "locationId" INTEGER NOT NULL,
 "quantity" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "responsibleEmployeeId" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReceiptAllocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReceiptAllocation_organizationId_shipmentId_idx" ON "ReceiptAllocation"("organizationId", "shipmentId");
CREATE UNIQUE INDEX "ReceiptAllocation_receiptId_containerProfileId_key" ON "ReceiptAllocation"("receiptId", "containerProfileId");
ALTER TABLE "ReceiptAllocation" ADD CONSTRAINT "ReceiptAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
