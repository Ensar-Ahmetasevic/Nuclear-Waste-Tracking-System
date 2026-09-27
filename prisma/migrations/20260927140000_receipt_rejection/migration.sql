CREATE TABLE "ReceiptRejection" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "locationId" INTEGER NOT NULL, "responsibleEmployeeId" INTEGER NOT NULL,
  "profiles" JSONB NOT NULL, "reasons" JSONB NOT NULL, "note" TEXT,
  "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptRejection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReceiptRejection_actionKey_key" ON "ReceiptRejection"("actionKey");
CREATE INDEX "ReceiptRejection_organizationId_shipmentId_idx" ON "ReceiptRejection"("organizationId", "shipmentId");
ALTER TABLE "ReceiptRejection" ADD CONSTRAINT "ReceiptRejection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
