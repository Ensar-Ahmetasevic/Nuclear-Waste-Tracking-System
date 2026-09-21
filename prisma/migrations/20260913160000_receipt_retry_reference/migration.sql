ALTER TABLE "PreStorageEntry" ADD COLUMN "receiptKey" TEXT, ADD COLUMN "receiptFingerprint" TEXT;
CREATE UNIQUE INDEX "PreStorageEntry_receiptKey_key" ON "PreStorageEntry"("receiptKey");
