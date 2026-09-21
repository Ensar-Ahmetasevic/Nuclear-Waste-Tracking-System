// Generated from prisma/schema.prisma for Prisma 7 stripped DMMF. Do not edit by hand.
module.exports = {
  "requiredScalars": {
    "Organization": [
      "id",
      "name",
      "createdAt"
    ],
    "UserProfile": [
      "sessionVersion",
      "id",
      "email",
      "password",
      "createdAt",
      "companyId",
      "companyName",
      "address",
      "active",
      "administrator"
    ],
    "ShippingInformation": [
      "id",
      "entryDateTime",
      "truckStatus",
      "status",
      "companyName",
      "driverName",
      "registrationPlates"
    ],
    "ContainerProfile": [
      "id",
      "createdAt",
      "containerStatus",
      "quantity",
      "shippingInformationId",
      "locationOriginId",
      "wasteProfileId"
    ],
    "LocationOrigin": [
      "id",
      "name",
      "address",
      "origin"
    ],
    "WasteProfile": [
      "id",
      "name",
      "typeOfWaste",
      "wasteDescription",
      "risksAndHazards",
      "processingMethods",
      "physicalProperties",
      "chemicalProperties",
      "biologicalProperties",
      "collectionProcedures",
      "containerTypeId"
    ],
    "ContainerType": [
      "id",
      "name",
      "material",
      "volume",
      "carryingCapacity",
      "radioactivityLevel",
      "physicalProperties",
      "footprint",
      "description"
    ],
    "PreStorageLocation": [
      "id",
      "name",
      "surfaceArea",
      "containerFootprint",
      "preStorageFor",
      "containerType",
      "wasteProfile"
    ],
    "PreStorageEntry": [
      "id",
      "createdAt",
      "quantity",
      "preStorageLocationId"
    ],
    "PreStorageResponsibleEmployee": [
      "id",
      "name",
      "surname",
      "dateOfBirth",
      "address",
      "qualifications",
      "safetyTraining"
    ],
    "PreStorageConditions": [
      "id",
      "createdAt",
      "preStorageTemperature",
      "preStorageRadiationLevel",
      "preStorageHumidity",
      "preStoragePressure",
      "preStorageLocationId",
      "preStorageResponsibleEmployeeId"
    ],
    "FinalStorageLocation": [
      "id",
      "name",
      "containerType",
      "containerFootprint",
      "surfaceArea",
      "depth",
      "quantity"
    ],
    "StorageTransferRequest": [
      "version",
      "id",
      "createdAt",
      "finalStorageStatus",
      "preStorageStatus",
      "requestedQuantity",
      "requestedByRoom",
      "requestedByEmployeeId"
    ],
    "FinalStorageResponsibleEmployee": [
      "id",
      "name",
      "surname",
      "dateOfBirth",
      "qualifications",
      "address",
      "safetyTraining"
    ],
    "FinalStorageCondition": [
      "id",
      "createdAt",
      "finalStorageTemperature",
      "finalStorageRadiationLevel",
      "finalStorageHumidity",
      "finalStoragePressure",
      "finalStorageLocationId"
    ],
    "AuthRateLimit": [
      "key",
      "attempts",
      "expiresAt"
    ],
    "TransferAction": [
      "id",
      "organizationId",
      "transferId",
      "actionKey",
      "fingerprint",
      "action",
      "quantity",
      "actorId",
      "createdAt"
    ],
    "ShippingCorrection": [
      "id",
      "organizationId",
      "shipmentId",
      "actorId",
      "reason",
      "before",
      "after",
      "actionKey",
      "fingerprint",
      "createdAt"
    ],
    "ShipmentDeparture": [
      "id",
      "organizationId",
      "shipmentId",
      "actorId",
      "actionKey",
      "fingerprint",
      "snapshot",
      "createdAt"
    ],
    "ShipmentArrival": [
      "id",
      "organizationId",
      "shipmentId",
      "actorId",
      "actionKey",
      "fingerprint",
      "snapshot",
      "createdAt"
    ],
    "AccountChange": [
      "id",
      "organizationId",
      "targetUserId",
      "actorId",
      "actionKey",
      "fingerprint",
      "reason",
      "before",
      "after",
      "changedFields",
      "createdAt"
    ],
    "ReceiptAllocation": [
      "id",
      "organizationId",
      "receiptId",
      "shipmentId",
      "containerProfileId",
      "locationId",
      "quantity",
      "actorId",
      "responsibleEmployeeId",
      "createdAt"
    ],
    "TransferSource": [
      "id",
      "organizationId",
      "transferId",
      "receiptAllocationId",
      "shipmentId",
      "containerProfileId",
      "locationId",
      "destinationId",
      "quantity",
      "state",
      "approvalActionId"
    ],
    "AccountCreation": [
      "id",
      "organizationId",
      "targetUserId",
      "actorId",
      "actionKey",
      "fingerprint",
      "createdAt"
    ],
    "ContainerCorrection": [
      "id",
      "organizationId",
      "shipmentId",
      "containerProfileId",
      "actorId",
      "actionKey",
      "fingerprint",
      "reason",
      "before",
      "after",
      "createdAt"
    ]
  },
  "defaultedScalars": {
    "Organization": [
      "id",
      "createdAt"
    ],
    "UserProfile": [
      "sessionVersion",
      "id",
      "createdAt",
      "active"
    ],
    "ShippingInformation": [
      "id",
      "entryDateTime",
      "truckStatus",
      "status"
    ],
    "ContainerProfile": [
      "id",
      "createdAt",
      "containerStatus"
    ],
    "LocationOrigin": [
      "id"
    ],
    "WasteProfile": [
      "id"
    ],
    "ContainerType": [
      "id"
    ],
    "PreStorageLocation": [
      "id"
    ],
    "PreStorageEntry": [
      "id",
      "createdAt"
    ],
    "PreStorageResponsibleEmployee": [
      "id",
      "safetyTraining"
    ],
    "PreStorageConditions": [
      "id",
      "createdAt"
    ],
    "FinalStorageLocation": [
      "id",
      "quantity"
    ],
    "StorageTransferRequest": [
      "version",
      "id",
      "createdAt",
      "finalStorageStatus",
      "preStorageStatus"
    ],
    "FinalStorageResponsibleEmployee": [
      "id"
    ],
    "FinalStorageCondition": [
      "id",
      "createdAt"
    ],
    "AuthRateLimit": [
      "key",
      "attempts"
    ],
    "TransferAction": [
      "id",
      "createdAt"
    ],
    "ShippingCorrection": [
      "id",
      "createdAt"
    ],
    "ShipmentDeparture": [
      "id",
      "createdAt"
    ],
    "ShipmentArrival": [
      "id",
      "createdAt"
    ],
    "AccountChange": [
      "id",
      "createdAt"
    ],
    "ReceiptAllocation": [
      "id",
      "createdAt"
    ],
    "TransferSource": [
      "id",
      "state"
    ],
    "AccountCreation": [
      "id",
      "createdAt"
    ],
    "ContainerCorrection": [
      "id",
      "createdAt"
    ]
  }
};
