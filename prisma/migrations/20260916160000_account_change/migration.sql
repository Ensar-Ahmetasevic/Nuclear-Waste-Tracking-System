CREATE TABLE "AccountChange" (
 "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "targetUserId" INTEGER NOT NULL,
 "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL, "changedFields" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AccountChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountChange_actionKey_key" ON "AccountChange"("actionKey");
CREATE INDEX "AccountChange_organizationId_targetUserId_idx" ON "AccountChange"("organizationId", "targetUserId");
ALTER TABLE "AccountChange" ADD CONSTRAINT "AccountChange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
