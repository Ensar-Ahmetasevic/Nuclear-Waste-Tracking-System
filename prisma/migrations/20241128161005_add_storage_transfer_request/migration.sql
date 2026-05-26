-- CreateTable
CREATE TABLE "StorageTransferRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedQuantity" INTEGER NOT NULL,
    "containerType" TEXT NOT NULL,
    "requestedByRoom" TEXT NOT NULL,
    "requestedByEmployeeId" INTEGER NOT NULL,
    "approvedByEmployeeId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "transportStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "responseNotes" TEXT,

    CONSTRAINT "StorageTransferRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "FinalStorageResponsibleEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageTransferRequest" ADD CONSTRAINT "StorageTransferRequest_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "PreStorageResponsibleEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
