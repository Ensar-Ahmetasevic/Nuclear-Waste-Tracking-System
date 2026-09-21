CREATE TABLE "ShipmentArrival" (
 "id" SERIAL NOT NULL,
 "organizationId" INTEGER NOT NULL,
 "shipmentId" INTEGER NOT NULL,
 "actorId" INTEGER NOT NULL,
 "actionKey" TEXT NOT NULL,
 "fingerprint" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ShipmentArrival_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShipmentArrival_actionKey_key" ON "ShipmentArrival"("actionKey");
CREATE INDEX "ShipmentArrival_organizationId_shipmentId_idx" ON "ShipmentArrival"("organizationId", "shipmentId");
ALTER TABLE "ShipmentArrival" ADD CONSTRAINT "ShipmentArrival_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
