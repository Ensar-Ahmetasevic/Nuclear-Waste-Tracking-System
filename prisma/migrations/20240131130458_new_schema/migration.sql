-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "administrator" BOOLEAN NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingInformation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "userProfileId" INTEGER,

    CONSTRAINT "ShippingInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerProfile" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "shippingInformationId" INTEGER NOT NULL,
    "locationOriginId" INTEGER NOT NULL,
    "wasteProfileId" INTEGER NOT NULL,
    "containerTypeId" INTEGER NOT NULL,

    CONSTRAINT "ContainerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationOrigin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "LocationOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "typeOfWaste" TEXT NOT NULL,
    "wasteDescription" TEXT NOT NULL,
    "risksAndHazards" TEXT NOT NULL,
    "processingMethods" TEXT NOT NULL,
    "physicalProperties" TEXT NOT NULL,
    "chemicalProperties" TEXT NOT NULL,
    "biologicalProperties" TEXT NOT NULL,
    "collectionProcedures" TEXT NOT NULL,
    "recommendationsForTransport" TEXT NOT NULL,

    CONSTRAINT "WasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "carryingCapacity" INTEGER NOT NULL,
    "radioactivityLevel" TEXT NOT NULL,
    "physicalProperties" TEXT NOT NULL,
    "footprint" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ContainerType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreStorageOfWaste" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "preStorageTypeId" INTEGER NOT NULL,
    "preStorageLocationId" INTEGER NOT NULL,
    "responsibleEmployeePreStorageId" INTEGER NOT NULL,

    CONSTRAINT "PreStorageOfWaste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreStorageType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surfaceArea" INTEGER NOT NULL,
    "preStorageFor" TEXT NOT NULL,

    CONSTRAINT "PreStorageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreStorageLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "stockroom" TEXT NOT NULL,

    CONSTRAINT "PreStorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleEmployeePreStorage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "dateOfBirth" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "safetyTraining" BOOLEAN NOT NULL,

    CONSTRAINT "ResponsibleEmployeePreStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreStorageConditions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preStorageTemperature" DOUBLE PRECISION NOT NULL,
    "preStorageRadiationLevel" DOUBLE PRECISION NOT NULL,
    "preStorageHumidity" DOUBLE PRECISION NOT NULL,
    "preStoragePressure" INTEGER NOT NULL,

    CONSTRAINT "PreStorageConditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageOfWaste" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "storageTypeId" INTEGER NOT NULL,
    "storageLocationId" INTEGER NOT NULL,
    "responsibleEmployeeStorageId" INTEGER NOT NULL,

    CONSTRAINT "StorageOfWaste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surfaceArea" INTEGER NOT NULL,
    "storageFor" TEXT NOT NULL,

    CONSTRAINT "StorageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "delepth" INTEGER NOT NULL,
    "roomName" TEXT NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleEmployeeStorage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "dateOfBirth" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "safetyTraining" BOOLEAN NOT NULL,

    CONSTRAINT "ResponsibleEmployeeStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageConditions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageTemperature" DOUBLE PRECISION NOT NULL,
    "storageRadiationLevel" DOUBLE PRECISION NOT NULL,
    "storageHumidity" DOUBLE PRECISION NOT NULL,
    "storagePressure" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StorageConditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingInformation_userProfileId_key" ON "ShippingInformation"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerProfile_shippingInformationId_key" ON "ContainerProfile"("shippingInformationId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerProfile_locationOriginId_key" ON "ContainerProfile"("locationOriginId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerProfile_wasteProfileId_key" ON "ContainerProfile"("wasteProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerProfile_containerTypeId_key" ON "ContainerProfile"("containerTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PreStorageOfWaste_preStorageTypeId_key" ON "PreStorageOfWaste"("preStorageTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PreStorageOfWaste_preStorageLocationId_key" ON "PreStorageOfWaste"("preStorageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "PreStorageOfWaste_responsibleEmployeePreStorageId_key" ON "PreStorageOfWaste"("responsibleEmployeePreStorageId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageOfWaste_storageTypeId_key" ON "StorageOfWaste"("storageTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageOfWaste_storageLocationId_key" ON "StorageOfWaste"("storageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageOfWaste_responsibleEmployeeStorageId_key" ON "StorageOfWaste"("responsibleEmployeeStorageId");

-- AddForeignKey
ALTER TABLE "ShippingInformation" ADD CONSTRAINT "ShippingInformation_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_shippingInformationId_fkey" FOREIGN KEY ("shippingInformationId") REFERENCES "ShippingInformation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_locationOriginId_fkey" FOREIGN KEY ("locationOriginId") REFERENCES "LocationOrigin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_wasteProfileId_fkey" FOREIGN KEY ("wasteProfileId") REFERENCES "WasteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_containerTypeId_fkey" FOREIGN KEY ("containerTypeId") REFERENCES "ContainerType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageOfWaste" ADD CONSTRAINT "PreStorageOfWaste_preStorageTypeId_fkey" FOREIGN KEY ("preStorageTypeId") REFERENCES "PreStorageType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageOfWaste" ADD CONSTRAINT "PreStorageOfWaste_preStorageLocationId_fkey" FOREIGN KEY ("preStorageLocationId") REFERENCES "PreStorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreStorageOfWaste" ADD CONSTRAINT "PreStorageOfWaste_responsibleEmployeePreStorageId_fkey" FOREIGN KEY ("responsibleEmployeePreStorageId") REFERENCES "ResponsibleEmployeePreStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageOfWaste" ADD CONSTRAINT "StorageOfWaste_storageTypeId_fkey" FOREIGN KEY ("storageTypeId") REFERENCES "StorageType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageOfWaste" ADD CONSTRAINT "StorageOfWaste_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageOfWaste" ADD CONSTRAINT "StorageOfWaste_responsibleEmployeeStorageId_fkey" FOREIGN KEY ("responsibleEmployeeStorageId") REFERENCES "ResponsibleEmployeeStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
