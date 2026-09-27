CREATE TABLE "ReturnAction" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "rejectionId" INTEGER NOT NULL, "action" TEXT NOT NULL, "note" TEXT NOT NULL,
  "changes" JSONB NOT NULL, "actorId" INTEGER NOT NULL, "actorRole" "UserRole" NOT NULL,
  "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnAction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReturnAction_actionKey_key" ON "ReturnAction"("actionKey");
CREATE INDEX "ReturnAction_organizationId_shipmentId_idx" ON "ReturnAction"("organizationId", "shipmentId");
ALTER TABLE "ReturnAction" ADD CONSTRAINT "ReturnAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
