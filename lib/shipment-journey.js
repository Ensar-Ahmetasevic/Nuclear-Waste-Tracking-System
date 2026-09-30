// The four steps of a truck on site, derived only from recorded data. Shared by
// the API (detail) and the list, so both show the same state. The journey ends
// when the truck leaves (OUT); where its containers go next is followed per
// Container Profile, not per truck.
//
// A step is "done" when its record exists, "blocked" when a Container Profile was
// rejected, "current" when it is the first step not done, else "upcoming".
export const JOURNEY_STEPS = ["arrival", "content", "receipt", "departure"];

const sum = (rows) =>
  rows.reduce((total, row) => total + (row.quantity || 0), 0);
const earliest = (dates) =>
  dates.filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0] || null;

export function shipmentJourney({
  truckStatus,
  entryDateTime,
  exitDateTime = null,
  containerProfiles = [],
  arrival = null,
  lastReceiptAt = null,
  departure = null,
}) {
  // A linked receipt record counts even if an older status flag says otherwise.
  const accepted = containerProfiles.filter(
    (row) => row.containerStatus === "accepted" || row.receiptRecorded,
  );
  const rejected = containerProfiles.filter(
    (row) => row.containerStatus === "rejected" && !row.receiptRecorded,
  );
  const containers = sum(containerProfiles);
  const received = sum(accepted);
  const steps = [
    {
      key: "arrival",
      done: true,
      at: arrival?.createdAt || entryDateTime,
      actorId: arrival?.actorId ?? null,
    },
    {
      key: "content",
      done: containerProfiles.length > 0,
      at: earliest(containerProfiles.map((row) => row.createdAt)),
      profiles: containerProfiles.length,
      containers,
    },
    {
      key: "receipt",
      done:
        containerProfiles.length > 0 &&
        accepted.length === containerProfiles.length,
      blocked: rejected.length > 0,
      at: lastReceiptAt,
      profiles: containerProfiles.length,
      profilesReceived: accepted.length,
      rejected: rejected.length,
      progress: { done: received, total: containers },
    },
    {
      key: "departure",
      done: truckStatus === "OUT",
      at: exitDateTime || departure?.createdAt || null,
      actorId: departure?.actorId ?? null,
    },
  ];
  const current = steps.find((step) => !step.done)?.key ?? null;
  for (const step of steps)
    step.state = step.done
      ? "done"
      : step.key === current
        ? step.blocked
          ? "blocked"
          : "current"
        : "upcoming";
  return { current, steps };
}
