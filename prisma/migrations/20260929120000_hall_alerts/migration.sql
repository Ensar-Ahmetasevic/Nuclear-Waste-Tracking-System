-- One alert per hall or room replaces the alerts per parameter. Earlier
-- per-parameter alerts and their events are removed; measurements and
-- monitoring rules are unchanged.
DROP TABLE "ConditionAlertEvent";
DROP TABLE "ConditionAlert";
DROP TYPE "AlertEventType";
DROP TYPE "AlertKind";

-- CreateEnum
CREATE TYPE "HallAlertEntryType" AS ENUM ('OPENED', 'MEASURED', 'OVERDUE', 'READ', 'MESSAGE', 'RESOLVED');

-- CreateTable
CREATE TABLE "HallAlert" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "area" "StorageArea" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "problems" JSONB NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "readById" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" INTEGER,
    "resolveNote" TEXT,

    CONSTRAINT "HallAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallAlertEntry" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "alertId" INTEGER NOT NULL,
    "type" "HallAlertEntryType" NOT NULL,
    "authorId" INTEGER,
    "text" TEXT,
    "problems" JSONB,
    "measurementId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallAlertEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HallAlert_organizationId_area_resolvedAt_idx" ON "HallAlert"("organizationId", "area", "resolvedAt");

-- CreateIndex
CREATE INDEX "HallAlertEntry_organizationId_alertId_idx" ON "HallAlertEntry"("organizationId", "alertId");

-- AddForeignKey
ALTER TABLE "HallAlert" ADD CONSTRAINT "HallAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallAlertEntry" ADD CONSTRAINT "HallAlertEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallAlertEntry" ADD CONSTRAINT "HallAlertEntry_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "HallAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only one unresolved alert per hall or room.
CREATE UNIQUE INDEX "HallAlert_open_key" ON "HallAlert"("organizationId", "area", "locationId") WHERE "resolvedAt" IS NULL;
