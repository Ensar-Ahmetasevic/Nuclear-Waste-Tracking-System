import { prisma } from "./scoped-database.cjs";
import { translate } from "../i18n";
import recordCodes from "../record-codes.cjs";
import { recordNames, nameOr } from "./record-names";
const { recordCode } = recordCodes;

export async function shipmentTimeline(shipment, administrator, includeContainerCorrections = administrator, returns = []) {
  const where = { shipmentId: shipment.id };
  // Read within the existing organization-scoped transaction.
  const shipmentRemovals = await prisma.shipmentRemoval.findMany({ where, take: 1 });
  const removals = await prisma.containerRemoval.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const preparations = await prisma.containerPreparation.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const preparedIds = new Set((await prisma.containerPreparation.findMany({ where: { containerProfileId: { in: shipment.containerProfiles.map(row => row.id) } }, select: { containerProfileId: true } })).map(row => row.containerProfileId));
  const arrivals = await prisma.shipmentArrival.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const departures = await prisma.shipmentDeparture.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const receipts = await prisma.receiptAllocation.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const legacyLinkIds = [...new Set(receipts.map(row => row.legacyLinkId).filter(Boolean))];
  const legacyLinks = legacyLinkIds.length ? await prisma.legacyReceiptLink.findMany({ where: { id: { in: legacyLinkIds } } }) : [];
  const sources = await prisma.transferSource.findMany({ where, orderBy: { id: "desc" }, take: 50 });
  const actionIds = sources.flatMap(row => [row.approvalActionId, row.resolutionActionId].filter(Boolean));
  const actions = actionIds.length ? await prisma.transferAction.findMany({ where: { id: { in: actionIds } } }) : [];
  const linkedEvents = sources.flatMap(source => actions.filter(action => action.id === source.approvalActionId || action.id === source.resolutionActionId).map(action => ({
    key: `transfer-${action.id}-source-${source.id}`, title: action.action === "PRE_STORAGE_ACCEPT_REQUEST" ? "Transfer approved" : action.action === "FINAL_STORAGE_ACCEPT_RESPONSE" ? "Final storage receipt recorded" : "Transfer returned for revision",
    date: action.createdAt, actorId: action.actorId, source, reason: action.reason,
  })));
  const corrections = administrator ? await prisma.shippingCorrection.findMany({ where, orderBy: { id: "desc" }, take: 50 }) : [];
  const containerCorrections = includeContainerCorrections ? await prisma.containerCorrection.findMany({ where, orderBy: { id: "desc" }, take: 50 }) : [];
  const names = await recordNames({
    users: [...actions, ...shipmentRemovals, ...removals, ...preparations, ...containerCorrections, ...arrivals, ...departures, ...receipts, ...corrections, ...returns, ...returns.flatMap(row => row.actions)].map(row => row.actorId),
    origins: [...removals.map(row => row.before.locationOriginId), ...preparations.map(row => row.snapshot.locationOriginId)],
    wastes: [...removals.map(row => row.before.wasteProfileId), ...preparations.map(row => row.snapshot.wasteProfileId)],
    types: preparations.map(row => row.snapshot.containerTypeId),
    halls: [...sources.map(row => row.locationId), ...receipts.map(row => row.locationId)],
    rooms: sources.map(row => row.destinationId),
    preEmployees: receipts.map(row => row.responsibleEmployeeId),
  });
  const origin = id => nameOr(names.origins, id, "Location origin");
  const waste = id => nameOr(names.wastes, id, "Waste profile");
  const hall = id => nameOr(names.halls, id, "Hall");
  const event = (kind, title, row, detail) => ({ key: `${kind}-${row.id}`, title, date: row.createdAt, actorId: row.actorId ?? null, actorName: names.users.get(row.actorId) ?? null, detail });
  const events = [
    ...linkedEvents.map(({ source, reason, ...row }) => ({ ...row, actorName: names.users.get(row.actorId) ?? null,
      detail: `Transfer #${source.transferId} · Profile ${recordCode("profile", source.containerProfileId)} · ${source.quantity} containers · ${hall(source.locationId)} → ${nameOr(names.rooms, source.destinationId, "Room")}${reason ? ` · ${reason}` : ""}` })),
    ...shipmentRemovals.map(row => event("shipment-removal", "Shipment deleted", row, `Shipment ${recordCode("shipment", row.shipmentId)} · ${row.before.containerProfiles.length} profiles removed · ${row.reason}`)),
    ...removals.map(row => event("removal", "Container Profile deleted", row, `Profile ${recordCode("profile", row.containerProfileId)} · ${row.before.quantity} containers · ${origin(row.before.locationOriginId)} · ${waste(row.before.wasteProfileId)} · Previous review status: ${row.before.containerStatus}${includeContainerCorrections ? ` · Reason: ${row.reason}` : ""}. Recorded storage stock was not changed.`)),
    ...preparations.map(row => event("preparation", "Container Profile prepared", row, `Profile ${recordCode("profile", row.containerProfileId)} · ${row.snapshot.quantity} containers · ${origin(row.snapshot.locationOriginId)} · ${waste(row.snapshot.wasteProfileId)} · ${nameOr(names.types, row.snapshot.containerTypeId, "Container type")}${row.reason ? ` · ${row.reason}` : ""}. Preparation does not confirm physical receipt.`)),
    ...containerCorrections.map(row => event("container-correction", "Container Profile corrected", row, `Profile ${recordCode("profile", row.containerProfileId)} · Quantity ${row.before.quantity} → ${row.after.quantity} · ${row.reason}`)),
    ...returns.map(row => event("return", "Returned from Pre-storage", row, `Return #${row.id} · ${row.hall ?? `Hall #${row.locationId}`} · ${row.profiles.map(item => `Profile ${recordCode("profile", item.containerProfileId)}${item.countedQuantity != null ? ` counted ${item.countedQuantity} of ${item.expectedQuantity}` : ""}`).join(", ")} · Reasons: ${row.reasons.map(code => translate("en", `return.reason.${code}`)).join("; ")}${row.note ? ` · ${row.note}` : ""} · Responsible employee ${row.responsibleEmployee ?? `#${row.responsibleEmployeeId}`}`)),
    ...returns.flatMap(report => report.actions.map(row => event(`return-action`, row.action === "ESCALATED" ? "Return sent to Supervision" : "Resent to Pre-storage after return", row, `Return #${row.rejectionId} · ${{ EMPLOYEE: "Shipments", SUPERVISION: "Supervision", ADMINISTRATOR: "Administrator" }[row.actorRole]} · ${row.changes.map(item => `Profile ${recordCode("profile", item.containerProfileId)} ${[["quantity", "quantity"], ["locationOrigin", "origin"], ["wasteProfile", "waste profile"]].filter(([key]) => item.before[key] !== item.after[key]).map(([key, label]) => `${label} ${item.before[key]} → ${item.after[key]}`).join(", ")}`).join("; ")}${row.changes.length ? " · " : ""}${row.note}`))),
    ...arrivals.map(row => event("arrival", "Arrival recorded", row, `Arrival #${row.id} · Shipment ${recordCode("shipment", shipment.id)}`)),
    ...departures.map(row => event("departure", "Departure recorded", row, `Departure #${row.id} · Shipment ${recordCode("shipment", shipment.id)}`)),
    ...receipts.map(row => {
      const link = legacyLinks.find(item => item.id === row.legacyLinkId);
      // An earlier receipt linked afterwards: the entry is the link, dated when it was made.
      return link
        ? event("receipt", "Earlier receipt linked by administrator", row, `Receipt #${row.receiptId} recorded ${new Date(link.receiptCreatedAt).toISOString()} without profile links · Profile ${recordCode("profile", row.containerProfileId)} · ${row.quantity} containers · ${hall(row.locationId)} · Link #${link.id}${administrator ? ` · ${link.reason}` : ""}. The receipt time comes from the earlier record; who received it is not recorded.`)
        : event("receipt", "Pre-storage receipt recorded", row, `Receipt #${row.receiptId} · Profile ${recordCode("profile", row.containerProfileId)} · ${row.quantity} containers · ${hall(row.locationId)} · Responsible employee ${nameOr(names.preEmployees, row.responsibleEmployeeId, "Responsible employee")}`);
    }),
    ...corrections.map(row => event("correction", "Administrative correction recorded", row, `Correction #${row.id} · ${row.reason}`)),
    ...shipment.containerProfiles.filter(row => !preparedIds.has(row.id)).map(row => event("profile", "Container Profile record created", row, `Profile ${recordCode("profile", row.id)} · Creator not recorded. This date does not confirm physical receipt.`)),
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
