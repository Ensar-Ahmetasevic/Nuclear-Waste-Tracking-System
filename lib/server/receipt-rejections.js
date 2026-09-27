import { prisma } from "./scoped-database.cjs";
import { recordNames } from "./record-names";

const strip = ({ fingerprint: _fingerprint, actionKey: _actionKey, organizationId: _organizationId, ...row }) => row;

// The newest report that returned this profile.
export const latestReport = (reports, profileId) =>
  reports.find((report) => report.profiles.some((row) => row.containerProfileId === profileId)) ?? null;

// A return is "open" at Step 1 until it is resent, "escalated" while Supervision
// decides, and "resolved" once resent or when none of its profiles is still
// returned by it (corrected or removed another way).
function returnState(report, reports, profiles) {
  if (report.actions.some((row) => row.action === "RESENT")) return "resolved";
  const returned = report.profiles.some((row) => {
    const profile = profiles.find((item) => item.id === row.containerProfileId);
    return profile?.containerStatus === "rejected" && latestReport(reports, profile.id)?.id === report.id;
  });
  if (!returned) return "resolved";
  return report.actions.some((row) => row.action === "ESCALATED") ? "escalated" : "open";
}

// Pre-storage return reports of the shipments, newest first, with the hall, the
// responsible employee, what Step 1 or Supervision did, and the current state.
async function reportsFor(shipments) {
  const ids = shipments.map((row) => row.id);
  if (!ids.length) return [];
  const rows = await prisma.receiptRejection.findMany({ where: { shipmentId: { in: ids } }, orderBy: { id: "desc" } });
  if (!rows.length) return [];
  const halls = await prisma.preStorageLocation.findMany({ where: { id: { in: [...new Set(rows.map((row) => row.locationId))] } }, select: { id: true, name: true } });
  const people = await prisma.preStorageResponsibleEmployee.findMany({ where: { id: { in: [...new Set(rows.map((row) => row.responsibleEmployeeId))] } }, select: { id: true, name: true, surname: true } });
  const actions = await prisma.returnAction.findMany({ where: { shipmentId: { in: ids } }, orderBy: { id: "asc" } });
  const { users } = await recordNames({ users: [...rows, ...actions].map((row) => row.actorId) });
  const reports = rows.map((row) => {
    const person = people.find((item) => item.id === row.responsibleEmployeeId);
    return {
      ...strip(row),
      actorName: users.get(row.actorId) ?? null,
      hall: halls.find((item) => item.id === row.locationId)?.name ?? null,
      responsibleEmployee: person ? `${person.name} ${person.surname}` : null,
      actions: actions
        .filter((item) => item.rejectionId === row.id)
        .map((item) => ({ ...strip(item), actorName: users.get(item.actorId) ?? null })),
    };
  });
  for (const shipment of shipments) {
    const own = reports.filter((report) => report.shipmentId === shipment.id);
    for (const report of own) report.state = returnState(report, own, shipment.containerProfiles || []);
  }
  return reports;
}

// Reports of one shipment; containerProfiles must carry id and containerStatus.
export const rejectionReports = (shipment) => reportsFor([shipment]);

// "escalated" when Supervision is deciding, "open" while Step 1 handles a return, else null.
export async function returnStates(shipments) {
  const reports = await reportsFor(shipments);
  return new Map(shipments.map((shipment) => {
    const states = reports.filter((report) => report.shipmentId === shipment.id).map((report) => report.state);
    return [shipment.id, states.includes("escalated") ? "escalated" : states.includes("open") ? "open" : null];
  }));
}

export { reportsFor };
