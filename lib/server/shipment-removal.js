import { createHash } from "node:crypto";

// Stable snapshot for both the review response and the transactional delete check.
export function shipmentRemovalSnapshot(shipment) {
  return {
    id: shipment.id,
    companyName: shipment.companyName,
    driverName: shipment.driverName,
    registrationPlates: shipment.registrationPlates,
    truckStatus: shipment.truckStatus,
    status: shipment.status,
    entryDateTime: new Date(shipment.entryDateTime).toISOString(),
    exitDateTime: shipment.exitDateTime ? new Date(shipment.exitDateTime).toISOString() : null,
    containerProfiles: shipment.containerProfiles.map(profile => ({
      id: profile.id, quantity: profile.quantity, containerStatus: profile.containerStatus,
      locationOriginId: profile.locationOriginId, wasteProfileId: profile.wasteProfileId,
      locationOriginName: profile.locationOrigin.name, wasteProfileName: profile.wasteProfile.name,
      createdAt: new Date(profile.createdAt).toISOString(),
    })).sort((a, b) => a.id - b.id),
  };
}
export const shipmentRemovalVersion = snapshot => createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
