-- AI translations of free text, one row per text and language.
-- CreateTable
CREATE TABLE "TextTranslation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "text" TEXT,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TextTranslation_organizationId_sourceHash_targetLanguage_key" ON "TextTranslation"("organizationId", "sourceHash", "targetLanguage");

-- AddForeignKey
ALTER TABLE "TextTranslation" ADD CONSTRAINT "TextTranslation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
