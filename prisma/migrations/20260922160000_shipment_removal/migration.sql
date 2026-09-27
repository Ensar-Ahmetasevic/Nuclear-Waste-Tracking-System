CREATE TABLE "ShipmentRemoval" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "before" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentRemoval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShipmentRemoval_actionKey_key" ON "ShipmentRemoval"("actionKey");
CREATE UNIQUE INDEX "ShipmentRemoval_shipmentId_key" ON "ShipmentRemoval"("shipmentId");
CREATE INDEX "ShipmentRemoval_organizationId_id_idx" ON "ShipmentRemoval"("organizationId", "id");
ALTER TABLE "ShipmentRemoval" ADD CONSTRAINT "ShipmentRemoval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
