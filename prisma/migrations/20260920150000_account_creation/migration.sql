CREATE TABLE "AccountCreation" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "targetUserId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "actionKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "workArea" "WorkArea",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountCreation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountCreation_actionKey_key" ON "AccountCreation"("actionKey");
CREATE INDEX "AccountCreation_organizationId_targetUserId_idx" ON "AccountCreation"("organizationId", "targetUserId");
ALTER TABLE "AccountCreation" ADD CONSTRAINT "AccountCreation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
