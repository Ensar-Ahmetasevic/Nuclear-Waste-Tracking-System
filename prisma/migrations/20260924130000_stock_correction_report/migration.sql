-- Every new stock correction carries the administrator's report; existing rows keep a null report.
-- AlterTable
ALTER TABLE "StockCorrection" ADD COLUMN     "report" JSONB;

