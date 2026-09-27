import { createHash } from "node:crypto";
import { prisma, positiveInteger } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
import { storageBalances } from "./storage-balances";
import recordCodes from "../record-codes.cjs";
const { recordCode } = recordCodes;

const ACTION_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_LIMIT = 50;
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const verificationSelect = { id: true, area: true, locationId: true, countedQuantity: true, recordedQuantity: true, recorded: true, actorId: true, reason: true, createdAt: true };

// Recorded figures a count is compared against. Their hash is the reviewed version.
function recordedFigures(area, location) {
  const inventory = location.inventory;
  return area === "PRE_STORAGE"
    ? { recordedQuantity: inventory.quantity, received: inventory.received, transferred: inventory.transferred, corrected: inventory.corrected, unlinkedQuantity: inventory.unlinkedQuantity, inconsistent: inventory.inconsistent }
    : { recordedQuantity: inventory.quantity, storedQuantity: inventory.storedQuantity, linkedReceived: inventory.linkedReceived, corrected: inventory.corrected, unlinkedTransfers: inventory.unlinkedTransfers };
}
// Unclamped balance, so a correction lands exactly on the counted quantity.
const rawQuantity = figures => "received" in figures
  ? figures.received - figures.transferred + figures.corrected
  : figures.storedQuantity + figures.linkedReceived + figures.corrected;
const receiptVersion = receipt => hash({ id: receipt.id, quantity: receipt.quantity, locationId: receipt.preStorageLocationId, createdAt: new Date(receipt.createdAt).toISOString() });
const correctionSelect = { id: true, area: true, locationId: true, verificationId: true, countedQuantity: true, delta: true, before: true, actorId: true, reason: true, report: true, createdAt: true };
const REPORT_LIMIT = 4000;
// Required: what was found and why it happened (the cause may still be under investigation).
function correctionReport(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const text = key => typeof input[key] === "string" ? input[key].trim() : input[key] == null ? "" : null;
  const report = { incident: text("incident"), cause: text("cause"), actions: text("actions"), references: text("references") };
  if (Object.values(report).some(value => value === null || value.length > REPORT_LIMIT) || report.incident.length < 3 || report.cause.length < 3) return null;
  return report;
}
const validAction = (actionKey, reason) => typeof actionKey === "string" && ACTION_KEY.test(actionKey) && typeof reason === "string" && reason.trim().length >= 3 && reason.trim().length <= 1000;

// Lists records that lack the links newer events carry. Nothing here links,
// moves or corrects stock; it discloses what cannot be proven from the data.
export async function reconciliationOverview() {
  const balances = await storageBalances();
  const allocations = await prisma.receiptAllocation.findMany({ select: { receiptId: true, containerProfileId: true } });
  const linkedReceipts = new Set(allocations.map(row => row.receiptId));
  const linkedProfiles = new Set(allocations.map(row => row.containerProfileId));
  const completed = new Set((await prisma.transferSource.findMany({ where: { state: "completed" }, select: { transferId: true } })).map(row => row.transferId));
  const accepted = await prisma.storageTransferRequest.findMany({
    where: { preStorageStatus: "completed", finalStorageStatus: "accepted" },
    select: { id: true, createdAt: true, requestedQuantity: true, requestedByRoom: true, finalStorageLocationId: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const verifications = await prisma.stockVerification.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: verificationSelect });
  const corrections = await prisma.stockCorrection.findMany({ select: correctionSelect });
  // The latest count of a hall, whether it was applied, and the version an administrator reviews.
  const latest = (area, id, figures) => {
    const verification = verifications.find(row => row.area === area && row.locationId === id);
    if (!verification) return null;
    const correction = corrections.find(row => row.verificationId === verification.id) || null;
    return { ...verification, correction, correctionVersion: correction ? null : hash({ verificationId: verification.id, figures }) };
  };

  const pre = balances.pre.map(location => {
    const figures = recordedFigures("PRE_STORAGE", location);
    const unlinked = location.preStorageEntry.filter(entry => !linkedReceipts.has(entry.id))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id);
    const findings = [];
    if (unlinked.length) findings.push(`${unlinked.length} receipt${unlinked.length === 1 ? "" : "s"} (${figures.unlinkedQuantity} containers) without a recorded link to a Container Profile. They are counted in recorded stock but cannot be selected as a transfer source.`);
    if (figures.inconsistent) findings.push("Linked completed transfers exceed recorded receipts.");
    return {
      id: location.id, name: location.name, figures, version: hash(figures), findings,
      unlinkedReceiptCount: unlinked.length,
      matchText: location.wasteProfile || location.containerType,
      unlinkedReceipts: unlinked.slice(0, LIST_LIMIT).map(entry => ({ id: entry.id, createdAt: entry.createdAt, quantity: entry.quantity, responsibleEmployeeId: entry.responsiblePreStorageEmployeeId, version: receiptVersion(entry) })),
      lastVerification: latest("PRE_STORAGE", location.id, figures),
    };
  });
  const final = balances.final.map(location => {
    const figures = recordedFigures("FINAL_STORAGE", location);
    const unlinked = accepted.filter(row => row.finalStorageLocationId === location.id && !completed.has(row.id));
    const findings = [];
    if (figures.storedQuantity) findings.push(`${figures.storedQuantity} containers are recorded as stored quantity without linked transfer events.`);
    if (unlinked.length) findings.push(`${unlinked.length} accepted transfer${unlinked.length === 1 ? "" : "s"} without a linked source. It is not provable whether they are already included in the stored quantity, so they are not added.`);
    return {
      id: location.id, name: location.name, figures, version: hash(figures), findings,
      unlinkedTransferCount: unlinked.length,
      unlinkedTransfers: unlinked.slice(0, LIST_LIMIT),
      lastVerification: latest("FINAL_STORAGE", location.id, figures),
    };
  });
  const profiles = (await prisma.containerProfile.findMany({
    where: { containerStatus: "accepted" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, createdAt: true, quantity: true, shippingInformationId: true, wasteProfile: { select: { name: true } } },
  })).filter(profile => !linkedProfiles.has(profile.id));
  return {
    pre, final,
    unlinkedAcceptedProfileCount: profiles.length,
    unlinkedAcceptedProfiles: profiles.slice(0, LIST_LIMIT).map(({ wasteProfile, ...profile }) => ({ ...profile, wasteProfileName: wasteProfile.name })),
    listLimit: LIST_LIMIT,
  };
}

// Records a count against the figures the reviewer saw. Recorded stock is unchanged.
export async function recordStockVerification(body, user) {
  const { area, locationId, countedQuantity, expectedVersion, actionKey, reason } = body;
  if (!["PRE_STORAGE", "FINAL_STORAGE"].includes(area) || !positiveInteger(locationId) ||
      !Number.isSafeInteger(countedQuantity) || countedQuantity < 0 || countedQuantity > 2147483647 ||
      typeof expectedVersion !== "string" || !/^[0-9a-f]{64}$/.test(expectedVersion) ||
      typeof actionKey !== "string" || !ACTION_KEY.test(actionKey) ||
      typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000)
    throw new HttpError(400, "Review the hall, enter the counted containers (0 or more) and describe the basis of the count (3–1000 characters).");
  const fingerprint = hash([area, locationId, countedQuantity, expectedVersion, reason.trim(), user.id]);
  const previous = await prisma.stockVerification.findFirst({ where: { actionKey }, select: { ...verificationSelect, fingerprint: true } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different verification.");
    const { fingerprint: _stored, ...verification } = previous;
    return { verification, replayed: true };
  }
  const location = (await storageBalances())[area === "PRE_STORAGE" ? "pre" : "final"].find(row => row.id === locationId);
  if (!location) throw new HttpError(404, "Hall not found");
  const figures = recordedFigures(area, location);
  if (hash(figures) !== expectedVersion) throw new HttpError(409, "Recorded stock for this hall changed after your review. Reload and compare the count again.");
  const verification = await prisma.stockVerification.create({ data: {
    area, locationId, countedQuantity, recordedQuantity: figures.recordedQuantity, recorded: figures,
    actorId: user.id, actionKey, fingerprint, reason: reason.trim(),
  }, select: verificationSelect });
  return { verification };
}

export async function listStockVerifications(searchParams) {
  const area = searchParams.get("area"), locationId = searchParams.get("locationId");
  const where = {};
  if (area || locationId) {
    if (!["PRE_STORAGE", "FINAL_STORAGE"].includes(area) || !positiveInteger(Number(locationId))) throw new HttpError(400, "Choose a hall");
    Object.assign(where, { area, locationId: Number(locationId) });
  }
  const total = await prisma.stockVerification.count({ where });
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(pages, Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1));
  const rows = await prisma.stockVerification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 10, take: 10, select: verificationSelect });
  const corrections = rows.length ? await prisma.stockCorrection.findMany({ where: { verificationId: { in: rows.map(row => row.id) } }, select: correctionSelect }) : [];
  const verifications = rows.map(row => ({ ...row, correction: corrections.find(item => item.verificationId === row.id) || null }));
  return { verifications, page, pages, total };
}

// Accepted profiles that have no recorded receipt link and can be matched to an earlier receipt.
export async function legacyLinkCandidates() {
  const linked = new Set((await prisma.receiptAllocation.findMany({ select: { containerProfileId: true } })).map(row => row.containerProfileId));
  const profiles = (await prisma.containerProfile.findMany({
    where: { containerStatus: "accepted" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, createdAt: true, quantity: true, shippingInformationId: true, wasteProfile: { select: { name: true } }, locationOrigin: { select: { name: true } } },
  })).filter(profile => !linked.has(profile.id));
  return { candidates: profiles.slice(0, 500).map(({ wasteProfile, locationOrigin, ...profile }) => ({ ...profile, wasteProfileName: wasteProfile.name, locationOriginName: locationOrigin.name })), total: profiles.length, limit: 500 };
}

// Links an earlier receipt to whole accepted profiles whose quantities add up
// exactly to the receipt. The receipt date stays the recorded one; no movement is added.
export async function linkLegacyReceipt(body, user) {
  const { receiptId, containerProfileIds, expectedVersion, actionKey, reason } = body;
  if (!positiveInteger(receiptId) || !Array.isArray(containerProfileIds) || !containerProfileIds.length || containerProfileIds.length > 100 ||
      !containerProfileIds.every(positiveInteger) || new Set(containerProfileIds).size !== containerProfileIds.length ||
      typeof expectedVersion !== "string" || !/^[0-9a-f]{64}$/.test(expectedVersion) || !validAction(actionKey, reason))
    throw new HttpError(400, "Select the receipt and its Container Profiles, and give the document reference (3–1000 characters).");
  const ids = [...containerProfileIds].sort((a, b) => a - b);
  const fingerprint = hash([receiptId, ids, expectedVersion, reason.trim(), user.id]);
  const linkSelect = { id: true, receiptId: true, locationId: true, receiptQuantity: true, receiptCreatedAt: true, profiles: true, actorId: true, reason: true, createdAt: true };
  const previous = await prisma.legacyReceiptLink.findFirst({ where: { actionKey }, select: { ...linkSelect, fingerprint: true } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different link.");
    const { fingerprint: _stored, ...link } = previous;
    return { link, replayed: true };
  }
  const receipt = await prisma.preStorageEntry.findUniqueOrThrow({ where: { id: receiptId } });
  if (receiptVersion(receipt) !== expectedVersion) throw new HttpError(409, "The receipt changed after your review. Reload before linking.");
  if (await prisma.receiptAllocation.count({ where: { receiptId } })) throw new HttpError(409, "This receipt already has recorded profile links.");
  const profiles = await prisma.containerProfile.findMany({ where: { id: { in: ids } }, include: { wasteProfile: { select: { name: true } } } });
  if (profiles.length !== ids.length) throw new HttpError(404, "A selected Container Profile was not found.");
  for (const profile of profiles) {
    if (profile.containerStatus !== "accepted") throw new HttpError(409, `Profile ${recordCode("profile", profile.id)} is not accepted and cannot be linked to a receipt.`);
    if (await prisma.receiptAllocation.count({ where: { containerProfileId: profile.id } })) throw new HttpError(409, `Profile ${recordCode("profile", profile.id)} is already linked to a receipt.`);
  }
  const total = profiles.reduce((sum, profile) => sum + profile.quantity, 0);
  if (total !== receipt.quantity)
    throw new HttpError(409, `The selected profiles contain ${total} containers but the receipt recorded ${receipt.quantity}. Only complete matches can be linked; profiles are not split. Record a verification if the records disagree.`);
  const link = await prisma.legacyReceiptLink.create({ data: {
    receiptId, locationId: receipt.preStorageLocationId, receiptQuantity: receipt.quantity, receiptCreatedAt: receipt.createdAt,
    profiles: profiles.sort((a, b) => a.id - b.id).map(profile => ({ containerProfileId: profile.id, shipmentId: profile.shippingInformationId, quantity: profile.quantity, wasteProfileName: profile.wasteProfile.name })),
    actorId: user.id, actionKey, fingerprint, reason: reason.trim(),
  }, select: linkSelect });
  for (const profile of profiles) {
    await prisma.receiptAllocation.create({ data: {
      receiptId, shipmentId: profile.shippingInformationId, containerProfileId: profile.id, locationId: receipt.preStorageLocationId,
      quantity: profile.quantity, actorId: user.id, responsibleEmployeeId: receipt.responsiblePreStorageEmployeeId, legacyLinkId: link.id,
    } });
  }
  return { link };
}

// Administrator approval: bring recorded stock to the latest recorded count of a hall.
export async function applyStockCorrection(body, user) {
  const { verificationId, expectedVersion, actionKey } = body;
  const report = correctionReport(body.report);
  if (!positiveInteger(verificationId) || typeof expectedVersion !== "string" || !/^[0-9a-f]{64}$/.test(expectedVersion) || typeof actionKey !== "string" || !ACTION_KEY.test(actionKey) || !report)
    throw new HttpError(400, `Review the verification and complete the report: what was found and the cause are required (3–${REPORT_LIMIT} characters each; state if the cause is still being investigated).`);
  const fingerprint = hash([verificationId, expectedVersion, report, user.id]);
  const previous = await prisma.stockCorrection.findFirst({ where: { actionKey }, select: { ...correctionSelect, fingerprint: true } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different correction.");
    const { fingerprint: _stored, ...correction } = previous;
    return { correction, replayed: true };
  }
  const verification = await prisma.stockVerification.findUniqueOrThrow({ where: { id: verificationId } });
  if (await prisma.stockCorrection.count({ where: { verificationId } })) throw new HttpError(409, "This verification has already been applied.");
  const newest = await prisma.stockVerification.findFirst({ where: { area: verification.area, locationId: verification.locationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  if (newest.id !== verification.id) throw new HttpError(409, "A newer verification exists for this hall. Review that count instead.");
  const location = (await storageBalances())[verification.area === "PRE_STORAGE" ? "pre" : "final"].find(row => row.id === verification.locationId);
  if (!location) throw new HttpError(404, "Hall not found");
  const figures = recordedFigures(verification.area, location);
  if (hash({ verificationId, figures }) !== expectedVersion) throw new HttpError(409, "Recorded stock changed after your review. Reload and record a new count if needed.");
  const delta = verification.countedQuantity - rawQuantity(figures);
  if (!delta) throw new HttpError(400, "Recorded stock already matches this count.");
  const correction = await prisma.stockCorrection.create({ data: {
    area: verification.area, locationId: verification.locationId, verificationId, countedQuantity: verification.countedQuantity,
    delta, before: figures, actorId: user.id, actionKey, fingerprint, reason: report.incident.slice(0, 1000), report,
  }, select: correctionSelect });
  return { correction };
}
