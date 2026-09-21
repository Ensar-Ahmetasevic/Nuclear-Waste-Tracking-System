CREATE TABLE "ShipmentDeparture" (
 "id" SERIAL PRIMARY KEY, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
 "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ShipmentDeparture_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShipmentDeparture_actionKey_key" ON "ShipmentDeparture"("actionKey");
CREATE INDEX "ShipmentDeparture_organizationId_shipmentId_idx" ON "ShipmentDeparture"("organizationId","shipmentId");
