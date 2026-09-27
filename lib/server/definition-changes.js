import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { DEFINITIONS, DEFINITION_TEXT_LIMIT } from "../definitions";
import { prisma, positiveInteger } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";

const ACTION_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const changeSelect = { id: true, definitionType: true, definitionId: true, action: true, actorId: true, reason: true, before: true, after: true, createdAt: true };
const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function normalizeDefinitionValues(kind, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "Definition values are required");
  const values = {};
  for (const field of DEFINITIONS[kind].fields) {
    const value = input[field.key];
    if (field.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new HttpError(400, `${field.label} must be a positive number`);
      values[field.key] = value;
    } else if (field.type === "integer" || field.type === "reference") {
      if (!positiveInteger(value)) throw new HttpError(400, field.type === "reference" ? `Select a valid ${field.label}` : `${field.label} must be a positive whole number`);
      values[field.key] = value;
    } else if (field.type === "date") {
      const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
      if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
        throw new HttpError(400, `${field.label} must be a valid date`);
      values[field.key] = value;
    } else if (field.type === "boolean") {
      if (typeof value !== "boolean") throw new HttpError(400, `Choose ${field.label}`);
      values[field.key] = value;
    } else {
      if (typeof value !== "string" || !value.trim() || value.trim().length > DEFINITION_TEXT_LIMIT) throw new HttpError(400, `${field.label} is required (up to ${DEFINITION_TEXT_LIMIT} characters)`);
      values[field.key] = value.trim();
    }
  }
  return values;
}

const fieldValue = (field, value) => field.type === "date" && value ? new Date(value).toISOString().slice(0, 10) : value;
const toData = (kind, values) => Object.fromEntries(DEFINITIONS[kind].fields.map(field =>
  [field.key, field.type === "date" ? new Date(`${values[field.key]}T00:00:00.000Z`) : values[field.key]]));

// The reviewed state of a definition. A Waste Profile also carries the name of
// its recommended Container Type as shown at that moment.
async function definitionSnapshot(kind, row) {
  const snapshot = Object.fromEntries(DEFINITIONS[kind].fields.map(field => [field.key, fieldValue(field, row[field.key])]));
  if (kind === "WASTE_PROFILE") {
    const type = row.containerType || await prisma.containerType.findUniqueOrThrow({ where: { id: row.containerTypeId }, select: { name: true } });
    snapshot.containerTypeName = type.name;
  }
  snapshot.archivedAt = row.archivedAt ? new Date(row.archivedAt).toISOString() : null;
  return snapshot;
}

// The version covers every field; the stored history omits personal values and
// records only which personal fields changed.
function recordedSnapshot(kind, snapshot) {
  return snapshot && Object.fromEntries(Object.entries(snapshot).filter(([key]) => !DEFINITIONS[kind].fields.some(field => field.personal && field.key === key)));
}

// Operational records that refer to a hall or responsible person by ID.
const STORAGE_REFERENCES = {
  PRE_STORAGE_LOCATION: [["preStorageEntry", "preStorageLocationId", "receipt"], ["preStorageConditions", "preStorageLocationId", "measurement"], ["receiptAllocation", "locationId", "receipt allocation"], ["transferSource", "locationId", "transfer source"]],
  FINAL_STORAGE_LOCATION: [["storageTransferRequest", "finalStorageLocationId", "transfer request"], ["finalStorageCondition", "finalStorageLocationId", "measurement"], ["transferSource", "destinationId", "linked transfer"]],
  PRE_STORAGE_EMPLOYEE: [["preStorageEntry", "responsiblePreStorageEmployeeId", "receipt"], ["preStorageConditions", "preStorageResponsibleEmployeeId", "measurement"], ["storageTransferRequest", "approvedByEmployeeId", "approved transfer"], ["receiptAllocation", "responsibleEmployeeId", "receipt allocation"]],
  FINAL_STORAGE_EMPLOYEE: [["storageTransferRequest", "requestedByEmployeeId", "requested transfer"], ["storageTransferRequest", "acceptedByEmployeeId", "accepted transfer"], ["finalStorageCondition", "finalStorageResponsibleEmployeeId", "measurement"]],
};

async function loadUsage(kind) {
  if (!STORAGE_REFERENCES[kind]) return (await loadDefinitionUsage())[kind];
  const usage = new Map();
  for (const [model, field, label] of STORAGE_REFERENCES[kind]) {
    for (const row of await prisma[model].groupBy({ by: [field], _count: { _all: true } })) {
      if (row[field] == null) continue;
      if (!usage.has(row[field])) usage.set(row[field], { references: [] });
      const references = usage.get(row[field]).references;
      const existing = references.find(item => item.label === label);
      if (existing) existing.count += row._count._all;
      else references.push({ label, count: row._count._all });
    }
  }
  return usage;
}

// Current profiles and recorded profile events (preparation, correction and
// removal snapshots) all give a definition its historical meaning.
export async function loadDefinitionUsage() {
  const usage = Object.fromEntries(Object.keys(DEFINITIONS).map(kind => [kind, new Map()]));
  const entry = (kind, id) => {
    if (!usage[kind].has(id)) usage[kind].set(id, { containerProfiles: 0, historyRecords: 0 });
    return usage[kind].get(id);
  };
  for (const [kind, field] of [["LOCATION_ORIGIN", "locationOriginId"], ["WASTE_PROFILE", "wasteProfileId"]]) {
    for (const row of await prisma.containerProfile.groupBy({ by: [field], _count: { _all: true } })) entry(kind, row[field]).containerProfiles = row._count._all;
  }
  const events = [
    ...(await prisma.containerPreparation.findMany({ select: { snapshot: true } })).map(row => [row.snapshot]),
    ...(await prisma.containerCorrection.findMany({ select: { before: true, after: true } })).map(row => [row.before, row.after]),
    ...(await prisma.containerRemoval.findMany({ select: { before: true } })).map(row => [row.before]),
  ];
  for (const snapshots of events) {
    for (const [kind, field] of [["LOCATION_ORIGIN", "locationOriginId"], ["WASTE_PROFILE", "wasteProfileId"], ["CONTAINER_TYPE", "containerTypeId"]]) {
      for (const id of new Set(snapshots.map(snapshot => snapshot?.[field]))) if (positiveInteger(id)) entry(kind, id).historyRecords++;
    }
  }
  for (const waste of await prisma.wasteProfile.findMany({ select: { id: true, name: true, archivedAt: true, containerTypeId: true } })) {
    const used = usage.WASTE_PROFILE.get(waste.id);
    Object.assign(entry("CONTAINER_TYPE", waste.containerTypeId), {
      containerProfiles: used?.containerProfiles ?? 0,
      wasteProfile: { ...waste, locked: Boolean(used?.containerProfiles || used?.historyRecords) },
    });
  }
  return usage;
}

export function describeDefinitionUsage(kind, usage, row) {
  if (STORAGE_REFERENCES[kind]) {
    const references = [...(usage?.references || [])];
    // Legacy stored quantity of a final hall is recorded stock even without linked transfers.
    if (kind === "FINAL_STORAGE_LOCATION" && row?.quantity > 0) references.push({ label: "recorded stored container", count: row.quantity });
    const lockReason = references.length ? `Referenced by ${references.map(item => plural(item.count, item.label)).join(", ")}.` : null;
    return { usage: { references }, locked: Boolean(lockReason), lockReason };
  }
  usage ||= { containerProfiles: 0, historyRecords: 0 };
  let lockReason = null;
  if (kind === "CONTAINER_TYPE" && usage.wasteProfile?.locked) {
    lockReason = `Recommended by Waste Profile “${usage.wasteProfile.name}”, which is used by Container Profiles or their recorded history.`;
  } else if (kind !== "CONTAINER_TYPE" && usage.containerProfiles) {
    lockReason = `Used by ${plural(usage.containerProfiles, "Container Profile")}.`;
  } else if (usage.historyRecords) {
    lockReason = `Used by ${plural(usage.historyRecords, "recorded Container Profile event")}.`;
  }
  return { usage, locked: Boolean(lockReason), lockReason };
}

async function assertContainerTypeAvailable(containerTypeId, wasteProfileId) {
  const type = await prisma.containerType.findUniqueOrThrow({ where: { id: containerTypeId } });
  if (type.archivedAt) throw new HttpError(409, `Container Type “${type.name}” is archived. Restore it or choose an active type.`);
  const assigned = await prisma.wasteProfile.findFirst({ where: { containerTypeId } });
  if (assigned && assigned.id !== wasteProfileId) {
    throw new HttpError(409, `This container type is already assigned to waste profile "${assigned.name}". Choose an unused type or keep the current type.`);
  }
}

// `include` and `decorate` keep the list responses other screens already rely on.
export function definitionRoutes(kind, { include = kind === "WASTE_PROFILE" ? { containerType: { select: { id: true, name: true, archivedAt: true } } } : undefined, decorate } = {}) {
  const definition = DEFINITIONS[kind];
  const records = () => prisma[definition.model];

  async function GET() {
    const rows = await records().findMany({ orderBy: { id: "desc" }, ...(include && { include }) });
    if (decorate) await decorate(rows);
    const usage = await loadUsage(kind);
    const data = [];
    for (const row of rows) {
      data.push({ ...row, ...describeDefinitionUsage(kind, usage.get(row.id), row), version: hash(await definitionSnapshot(kind, row)) });
    }
    return NextResponse.json({ [definition.listKey]: data });
  }

  async function change(request, { user }, action) {
    const body = await request.json();
    const { actionKey, reason = "" } = body;
    const creating = action === "CREATE";
    if (typeof actionKey !== "string" || !ACTION_KEY.test(actionKey) || typeof reason !== "string" || reason.trim().length > 1000 || (!creating && reason.trim().length < 3))
      throw new HttpError(400, creating ? "Review the definition before confirming. The optional note is limited to 1000 characters." : "Review the change and provide a reason (3–1000 characters).");
    const id = creating ? null : body.id;
    const expectedVersion = creating ? null : body.expectedVersion;
    if (!creating && (!positiveInteger(id) || typeof expectedVersion !== "string" || !/^[0-9a-f]{64}$/.test(expectedVersion)))
      throw new HttpError(400, "Review the current definition before confirming.");
    const values = creating || action === "UPDATE" ? normalizeDefinitionValues(kind, body.values) : null;
    const fingerprint = hash([kind, action, id, values, expectedVersion, reason.trim(), user.id]);
    const previous = await prisma.definitionChange.findFirst({ where: { actionKey }, select: { ...changeSelect, fingerprint: true } });
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different definition change.");
      const { fingerprint: _stored, ...replayed } = previous;
      return NextResponse.json({ change: replayed, replayed: true });
    }

    let before = null, after = null, definitionId = id;
    if (creating) {
      if (kind === "WASTE_PROFILE") await assertContainerTypeAvailable(values.containerTypeId, null);
      const row = await records().create({ data: toData(kind, values) });
      definitionId = row.id;
      after = await definitionSnapshot(kind, row);
    } else {
      const row = await records().findUniqueOrThrow({ where: { id } });
      before = await definitionSnapshot(kind, row);
      if (hash(before) !== expectedVersion) throw new HttpError(409, `This ${definition.label} changed after your review. Close and reload before reviewing again.`);
      const { usage, locked, lockReason } = describeDefinitionUsage(kind, (await loadUsage(kind)).get(id), row);
      if (["ARCHIVE", "RESTORE"].includes(action) && !definition.archivable) throw new HttpError(400, `A ${definition.label} cannot be archived.`);
      if (action === "UPDATE") {
        if (row.archivedAt && definition.lockEdits) throw new HttpError(409, `This ${definition.label} is archived. Restore it before editing.`);
        if (locked && definition.lockEdits) throw new HttpError(409, `${lockReason} Its values cannot be rewritten because existing records rely on them. Archive it and create a new ${definition.label} instead.`);
        const changedFields = definition.fields.filter(field => values[field.key] !== before[field.key]).map(field => field.key);
        if (!changedFields.length) throw new HttpError(400, "No changes to save");
        if (kind === "WASTE_PROFILE" && values.containerTypeId !== row.containerTypeId) await assertContainerTypeAvailable(values.containerTypeId, id);
        after = { ...await definitionSnapshot(kind, await records().update({ where: { id }, data: toData(kind, values) })), changedFields };
      } else if (action === "ARCHIVE") {
        if (row.archivedAt) throw new HttpError(409, `This ${definition.label} is already ${definition.words.archived}.`);
        if (kind === "CONTAINER_TYPE" && usage.wasteProfile && !usage.wasteProfile.archivedAt)
          throw new HttpError(409, `Waste Profile “${usage.wasteProfile.name}” still recommends this Container Type. Archive that Waste Profile first.`);
        after = await definitionSnapshot(kind, await records().update({ where: { id }, data: { archivedAt: new Date() } }));
      } else if (action === "RESTORE") {
        if (!row.archivedAt) throw new HttpError(409, `This ${definition.label} is not ${definition.words.archived}.`);
        if (kind === "WASTE_PROFILE") {
          const type = await prisma.containerType.findUniqueOrThrow({ where: { id: row.containerTypeId } });
          if (type.archivedAt) throw new HttpError(409, `Its Container Type “${type.name}” is archived. Restore the Container Type first.`);
        }
        after = await definitionSnapshot(kind, await records().update({ where: { id }, data: { archivedAt: null } }));
      } else {
        if (locked) throw new HttpError(409, `This ${definition.label} is used by existing records and cannot be deleted. ${lockReason} Archive it instead.`);
        if (usage.wasteProfile) throw new HttpError(409, "This Container Type is used by a Waste Profile and cannot be deleted. Existing profile definitions must be preserved.");
        await records().delete({ where: { id } });
      }
    }
    const recorded = await prisma.definitionChange.create({ data: {
      definitionType: kind, definitionId, action, actorId: user.id, actionKey, fingerprint,
      reason: reason.trim() || null, ...(before && { before: recordedSnapshot(kind, before) }), ...(after && { after: recordedSnapshot(kind, after) }),
    }, select: changeSelect });
    return NextResponse.json({ change: recorded });
  }

  return {
    GET,
    POST: (request, context) => change(request, context, "CREATE"),
    PUT: (request, context) => change(request, context, "UPDATE"),
    DELETE: (request, context) => change(request, context, "DELETE"),
    PATCH: async (request, context) => {
      const { action } = await request.clone().json();
      if (!["ARCHIVE", "RESTORE"].includes(action)) throw new HttpError(400, "Choose archive or restore");
      return change(request, context, action);
    },
  };
}

export async function listDefinitionChanges(searchParams) {
  const type = searchParams.get("type");
  const definitionId = searchParams.get("definitionId");
  const where = {};
  if (type) {
    if (!DEFINITIONS[type]) throw new HttpError(400, "Unknown definition type");
    where.definitionType = type;
  }
  if (definitionId) {
    if (!positiveInteger(Number(definitionId))) throw new HttpError(400, "Invalid definition ID");
    where.definitionId = Number(definitionId);
  }
  const total = await prisma.definitionChange.count({ where });
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(pages, Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1));
  const changes = await prisma.definitionChange.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 10, take: 10, select: changeSelect });
  return { changes, page, pages, total };
}

// New receipts, measurements and transfer decisions may only name an active
// responsible person. Replays of already confirmed actions are checked earlier.
export async function assertActiveResponsibleEmployee(pre, id) {
  const person = await (pre ? prisma.preStorageResponsibleEmployee : prisma.finalStorageResponsibleEmployee).findUniqueOrThrow({ where: { id } });
  if (person.archivedAt) throw new HttpError(409, `${person.name} ${person.surname} is deactivated as a responsible employee and cannot be chosen for new records. Reload and choose an active employee.`);
}
