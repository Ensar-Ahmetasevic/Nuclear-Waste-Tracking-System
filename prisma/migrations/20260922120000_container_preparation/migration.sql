CREATE TABLE "ContainerPreparation" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "containerProfileId" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContainerPreparation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContainerPreparation_actionKey_key" ON "ContainerPreparation"("actionKey");
CREATE UNIQUE INDEX "ContainerPreparation_containerProfileId_key" ON "ContainerPreparation"("containerProfileId");
CREATE INDEX "ContainerPreparation_organizationId_shipmentId_idx" ON "ContainerPreparation"("organizationId", "shipmentId");
ALTER TABLE "ContainerPreparation" ADD CONSTRAINT "ContainerPreparation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
