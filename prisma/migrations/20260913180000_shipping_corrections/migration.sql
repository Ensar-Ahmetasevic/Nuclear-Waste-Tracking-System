CREATE TABLE "ShippingCorrection" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL,
  "shipmentId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShippingCorrection_actionKey_key" ON "ShippingCorrection"("actionKey");
CREATE INDEX "ShippingCorrection_organizationId_shipmentId_idx" ON "ShippingCorrection"("organizationId", "shipmentId");
