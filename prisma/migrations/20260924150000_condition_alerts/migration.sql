-- Monitoring rules (append-only versions), condition alerts and their immutable events.
-- No alerts are created for earlier measurements; existing measurements are unchanged.
-- CreateEnum
CREATE TYPE "MonitoringParameter" AS ENUM ('TEMPERATURE', 'RADIATION', 'HUMIDITY', 'PRESSURE');

-- CreateEnum
CREATE TYPE "AlertKind" AS ENUM ('OUT_OF_RANGE', 'MISSING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertEventType" AS ENUM ('OPENED', 'CONTINUED', 'SEVERITY_RAISED', 'CONDITION_CLEARED', 'ACKNOWLEDGED', 'NOTE', 'ESCALATED', 'CLOSED');

-- CreateTable
CREATE TABLE "MonitoringRule" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "area" "StorageArea" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "parameter" "MonitoringParameter" NOT NULL,
    "lowerDanger" DOUBLE PRECISION,
    "lowerWarning" DOUBLE PRECISION,
    "upperWarning" DOUBLE PRECISION,
    "upperDanger" DOUBLE PRECISION,
    "intervalHours" INTEGER NOT NULL,
    "approvalReference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionAlert" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "area" "StorageArea" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "parameter" "MonitoringParameter" NOT NULL,
    "kind" "AlertKind" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "rule" JSONB NOT NULL,
    "firstMeasurementId" INTEGER,
    "lastMeasurementId" INTEGER,
    "lastValue" DOUBLE PRECISION,
    "lastMeasuredAt" TIMESTAMP(3),
    "measurementCount" INTEGER NOT NULL DEFAULT 0,
    "clearedAt" TIMESTAMP(3),
    "clearedByMeasurementId" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" INTEGER,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" INTEGER,
    "closeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionAlertEvent" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "alertId" INTEGER NOT NULL,
    "type" "AlertEventType" NOT NULL,
    "actorId" INTEGER,
    "measurementId" INTEGER,
    "value" DOUBLE PRECISION,
    "note" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "actionKey" TEXT,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringRule_actionKey_key" ON "MonitoringRule"("actionKey");

-- CreateIndex
CREATE INDEX "MonitoringRule_organizationId_area_locationId_parameter_cre_idx" ON "MonitoringRule"("organizationId", "area", "locationId", "parameter", "createdAt");

-- CreateIndex
CREATE INDEX "ConditionAlert_organizationId_area_closedAt_idx" ON "ConditionAlert"("organizationId", "area", "closedAt");

-- CreateIndex
CREATE INDEX "ConditionAlert_organizationId_area_locationId_parameter_kin_idx" ON "ConditionAlert"("organizationId", "area", "locationId", "parameter", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionAlertEvent_actionKey_key" ON "ConditionAlertEvent"("actionKey");

-- CreateIndex
CREATE INDEX "ConditionAlertEvent_organizationId_alertId_idx" ON "ConditionAlertEvent"("organizationId", "alertId");

-- AddForeignKey
ALTER TABLE "MonitoringRule" ADD CONSTRAINT "MonitoringRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionAlert" ADD CONSTRAINT "ConditionAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionAlertEvent" ADD CONSTRAINT "ConditionAlertEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionAlertEvent" ADD CONSTRAINT "ConditionAlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "ConditionAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Only one open alert per hall, parameter and kind.
CREATE UNIQUE INDEX "ConditionAlert_open_key" ON "ConditionAlert"("organizationId", "area", "locationId", "parameter", "kind") WHERE "closedAt" IS NULL;
