import { prisma } from "./scoped-database.cjs";

export async function shipmentTimeline(shipment, administrator, includeContainerCorrections = administrator) {
  const where = { shipmentId: shipment.id };
  // Read within the existing organization-scoped transaction.
  const arrivals = await prisma.shipmentArrival.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const departures = await prisma.shipmentDeparture.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const receipts = await prisma.receiptAllocation.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const sources = await prisma.transferSource.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const actionIds = sources.flatMap(row => [row.approvalActionId, row.resolutionActionId].filter(Boolean));
  const actions = actionIds.length ? await prisma.transferAction.findMany({ where: { id: { in: actionIds } } }) : [];
  const linkedEvents = sources.flatMap(source => actions.filter(action => action.id === source.approvalActionId || action.id === source.resolutionActionId).map(action => ({
    key: `transfer-${action.id}-source-${source.id}`, title: action.action === "PRE_STORAGE_ACCEPT_REQUEST" ? "Transfer approved" : action.action === "FINAL_STORAGE_ACCEPT_RESPONSE" ? "Final storage receipt recorded" : "Transfer returned for revision",
    date: action.createdAt, actorId: action.actorId,
    detail: `Transfer #${source.transferId} · Profile #${source.containerProfileId} · ${source.quantity} containers · Hall #${source.locationId} → Final room #${source.destinationId}${action.reason ? ` · ${action.reason}` : ""}`,
  })));
  const corrections = administrator ? await prisma.shippingCorrection.findMany({ where, orderBy: { id: "desc" }, take: 50 }) : [];
  const containerCorrections = includeContainerCorrections ? await prisma.containerCorrection.findMany({ where, orderBy: { id: "desc" }, take: 50 }) : [];
  const event = (kind, title, row, detail) => ({ key: `${kind}-${row.id}`, title, date: row.createdAt, actorId: row.actorId ?? null, detail });
  const events = [
    ...linkedEvents,
    ...containerCorrections.map(row => event("container-correction", "Container Profile corrected", row, `Profile #${row.containerProfileId} · Quantity ${row.before.quantity} → ${row.after.quantity} · ${row.reason}`)),
    ...arrivals.map(row => event("arrival", "Arrival recorded", row, `Arrival #${row.id} · Shipment #${shipment.id}`)),
    ...departures.map(row => event("departure", "Departure recorded", row, `Departure #${row.id} · Shipment #${shipment.id}`)),
    ...receipts.map(row => event("receipt", "Pre-storage receipt recorded", row, `Receipt #${row.receiptId} · Profile #${row.containerProfileId} · ${row.quantity} containers · Hall #${row.locationId} · Responsible employee #${row.responsibleEmployeeId}`)),
    ...corrections.map(row => event("correction", "Administrative correction recorded", row, `Correction #${row.id} · ${row.reason}`)),
    ...shipment.containerProfiles.map(row => event("profile", "Container Profile record created", row, `Profile #${row.id} · Creator not recorded. This date does not confirm physical receipt.`)),
  ].sort((a,b) => new Date(b.date) - new Date(a.date) || a.key.localeCompare(b.key));
  return {
    events: events.slice(0,50),
    limit: 50,
    notes: [
      ...(!arrivals.length ? ["No separate arrival event was recorded for this shipment. See the current arrival date in the transport summary."] : []),
      ...(!receipts.length ? ["No linked pre-storage receipt event is recorded. Older receipts cannot be assigned to this shipment from the available data."] : []),
      "Only transfers approved with a linked source receipt appear here. Earlier transfers and unlinked requests cannot be assigned to this shipment; missing events do not prove that no transfer occurred.",
    ],
  };
}
