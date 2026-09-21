ALTER TABLE "PreStorageConditions" ADD COLUMN "submissionKey" TEXT, ADD COLUMN "recordedById" INTEGER;
ALTER TABLE "FinalStorageCondition" ADD COLUMN "submissionKey" TEXT, ADD COLUMN "recordedById" INTEGER;
CREATE UNIQUE INDEX "PreStorageConditions_submissionKey_key" ON "PreStorageConditions"("submissionKey");
CREATE UNIQUE INDEX "FinalStorageCondition_submissionKey_key" ON "FinalStorageCondition"("submissionKey");
