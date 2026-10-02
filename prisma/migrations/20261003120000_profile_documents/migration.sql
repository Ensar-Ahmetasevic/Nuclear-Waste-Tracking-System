-- Files kept with a Container Profile. Removal keeps the row and the file.
CREATE TYPE "DocumentKind" AS ENUM ('TRANSPORT', 'MEASUREMENT', 'INSPECTION', 'CHARACTERIZATION', 'APPROVAL', 'OTHER');

CREATE TABLE "ProfileDocument" (
  "id" SERIAL NOT NULL, "organizationId" INTEGER NOT NULL, "shipmentId" INTEGER NOT NULL,
  "containerProfileId" INTEGER NOT NULL, "kind" "DocumentKind" NOT NULL, "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "data" BYTEA NOT NULL,
  "actorId" INTEGER NOT NULL, "actionKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3), "removedById" INTEGER, "removeReason" TEXT,
  CONSTRAINT "ProfileDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileDocument_actionKey_key" ON "ProfileDocument"("actionKey");
CREATE INDEX "ProfileDocument_organizationId_containerProfileId_idx" ON "ProfileDocument"("organizationId", "containerProfileId");
ALTER TABLE "ProfileDocument" ADD CONSTRAINT "ProfileDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
