CREATE TABLE "ContainerRemoval" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "containerProfileId" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "reason" TEXT NOT NULL, "before" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContainerRemoval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContainerRemoval_actionKey_key" ON "ContainerRemoval"("actionKey");
CREATE UNIQUE INDEX "ContainerRemoval_containerProfileId_key" ON "ContainerRemoval"("containerProfileId");
CREATE INDEX "ContainerRemoval_organizationId_shipmentId_idx" ON "ContainerRemoval"("organizationId", "shipmentId");
ALTER TABLE "ContainerRemoval" ADD CONSTRAINT "ContainerRemoval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
