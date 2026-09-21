CREATE TABLE "ContainerCorrection" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "containerProfileId" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "reason" TEXT NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContainerCorrection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContainerCorrection_actionKey_key" ON "ContainerCorrection"("actionKey");
CREATE INDEX "ContainerCorrection_organizationId_shipmentId_idx" ON "ContainerCorrection"("organizationId", "shipmentId");
ALTER TABLE "ContainerCorrection" ADD CONSTRAINT "ContainerCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
