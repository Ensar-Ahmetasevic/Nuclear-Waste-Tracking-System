-- One approval/resolution can cover several distinct receipt allocations.
DROP INDEX "TransferSource_approvalActionId_key";
DROP INDEX "TransferSource_resolutionActionId_key";
CREATE UNIQUE INDEX "TransferSource_approvalActionId_receiptAllocationId_key" ON "TransferSource"("approvalActionId", "receiptAllocationId");
CREATE INDEX "TransferSource_resolutionActionId_idx" ON "TransferSource"("resolutionActionId");
