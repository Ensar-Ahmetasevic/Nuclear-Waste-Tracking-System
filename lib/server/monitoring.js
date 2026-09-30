import { createHash } from "node:crypto";
import { prisma, positiveInteger } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
import {
  DEFAULT_RULES,
  MONITORING_PARAMETERS,
  classify,
  ruleProblem,
} from "../monitoring";
import { peopleMap, recordNames } from "./record-names";

const ACTION_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const HOUR = 3600 * 1000;
const RULE_FIELDS = [
  "lowerDanger",
  "lowerWarning",
  "upperWarning",
  "upperDanger",
  "intervalHours",
];
export const AREAS = {
  PRE_STORAGE: {
    prefix: "preStorage",
    relation: "preStorageConditions",
    locations: "preStorageLocation",
    measurements: "preStorageConditions",
    href: "/pre-storage",
  },
  FINAL_STORAGE: {
    prefix: "finalStorage",
    relation: "finalStorageConditions",
    locations: "finalStorageLocation",
    measurements: "finalStorageCondition",
    href: "/final-storage",
  },
};
// Newest rule version per hall and parameter; defaults are marked unconfirmed.
export async function effectiveRules(area, locationIds) {
  const versions = await prisma.monitoringRule.findMany({
    where: { area, ...(locationIds && { locationId: { in: locationIds } }) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const get = (locationId, parameter) => {
    const version = versions.find(
      (row) => row.locationId === locationId && row.parameter === parameter,
    );
    return version
      ? {
          ...Object.fromEntries(RULE_FIELDS.map((key) => [key, version[key]])),
          confirmed: true,
          ruleId: version.id,
          approvalReference: version.approvalReference,
          actorId: version.actorId,
          createdAt: version.createdAt,
        }
      : { ...DEFAULT_RULES[parameter], confirmed: false, ruleId: null };
  };
  return { get, versions };
}

const managers = (user) => ["ADMINISTRATOR", "SUPERVISION"].includes(user.role);
const MESSAGE_LIMIT = 1000;

// What is wrong in a measurement: every parameter outside its range, worst first.
function measuredProblems(get, locationId, row, prefix) {
  return MONITORING_PARAMETERS.flatMap((parameter) => {
    const value = row[prefix + parameter.field];
    const level = classify(get(locationId, parameter.key), value);
    return level === "warning" || level === "danger"
      ? [{ key: parameter.key, level, value, unit: parameter.unit }]
      : [];
  }).sort((a, b) => (b.level === "danger") - (a.level === "danger"));
}

const severityOf = (problems) =>
  problems.some((problem) => problem.level === "danger") ? "CRITICAL" : "WARNING";

// A problem that is new or got worse makes the alert unread again, so
// Supervision is notified once more.
const worse = (before, after) =>
  after.some((problem) => {
    const earlier = before.find((row) => row.key === problem.key);
    return !earlier || (earlier.level === "warning" && problem.level === "danger");
  });

const openAlertOf = (area, locationId) =>
  prisma.hallAlert.findFirst({ where: { area, locationId, resolvedAt: null } });

// Opens the hall's alert, or brings its problems up to date. Returns the alert.
async function applyProblems(area, locationId, problems, { type, at, measurementId = null }) {
  const open = await openAlertOf(area, locationId);
  if (!open) {
    if (!problems.length) return null;
    const alert = await prisma.hallAlert.create({
      data: { area, locationId, severity: severityOf(problems), problems, openedAt: at, changedAt: at },
    });
    await prisma.hallAlertEntry.create({
      data: { alertId: alert.id, type: "OPENED", problems, measurementId, createdAt: at },
    });
    return alert;
  }
  const renotify = worse(open.problems, problems);
  const alert = await prisma.hallAlert.update({
    where: { id: open.id },
    data: {
      problems,
      changedAt: at,
      // Back within range keeps the last severity until the alert is resolved.
      ...(problems.length && { severity: severityOf(problems) }),
      ...(renotify && { readAt: null, readById: null }),
    },
  });
  await prisma.hallAlertEntry.create({
    data: { alertId: alert.id, type, problems, measurementId, createdAt: at },
  });
  return alert;
}

// Called in the same transaction as a new measurement. The measurement replaces
// the problems of the hall's alert (including an overdue measurement).
export async function evaluateMeasurement(area, row) {
  const config = AREAS[area];
  const locationId = row[`${config.prefix}LocationId`];
  await prisma.$lock(`hall-alerts:${area}`);
  const { get } = await effectiveRules(area, [locationId]);
  const problems = measuredProblems(get, locationId, row, config.prefix);
  const alert = await applyProblems(area, locationId, problems, {
    type: "MEASURED",
    at: row.createdAt,
    measurementId: row.id,
  });
  return alert ? { id: alert.id, problems } : null;
}

// Adds an overdue measurement to the hall's alert once the shortest expected
// interval has passed, and opens an alert for a latest measurement outside
// range that has none (e.g. recorded before these alerts existed). Evaluated on
// use; there is no background job. Returns halls without any measurement: they
// are shown, never presented as in order.
export async function sweepMonitoring(area, now = new Date()) {
  const config = AREAS[area];
  // Parallel requests would otherwise open the same alert twice.
  await prisma.$lock(`hall-alerts:${area}`);
  const locations = await prisma[config.locations].findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      [config.relation]: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });
  const { get } = await effectiveRules(area);
  const noData = [];
  for (const location of locations) {
    const last = location[config.relation][0];
    if (!last) {
      noData.push({ locationId: location.id, locationName: location.name });
      continue;
    }
    const hours = Math.min(
      ...MONITORING_PARAMETERS.map((parameter) => get(location.id, parameter.key).intervalHours),
    );
    let open = await openAlertOf(area, location.id);
    if (!open) {
      const problems = measuredProblems(get, location.id, last, config.prefix);
      if (problems.length)
        open = await applyProblems(area, location.id, problems, {
          type: "MEASURED",
          at: last.createdAt,
          measurementId: last.id,
        });
    }
    const dueAt = new Date(new Date(last.createdAt).getTime() + hours * HOUR);
    if (now < dueAt) continue;
    if (open?.problems.some((problem) => problem.key === "OVERDUE")) continue;
    await applyProblems(
      area,
      location.id,
      [...(open?.problems || []), { key: "OVERDUE", level: "warning", since: dueAt }],
      { type: "OVERDUE", at: dueAt },
    );
  }
  return { noData, locations };
}

const locationNameOf = (locations, id) =>
  locations.find((location) => location.id === id)?.name || `#${id}`;

const alertView = (alert, locations) => ({
  id: alert.id,
  area: alert.area,
  locationId: alert.locationId,
  locationName: locationNameOf(locations, alert.locationId),
  severity: alert.severity,
  problems: alert.problems,
  openedAt: alert.openedAt,
  changedAt: alert.changedAt,
  readAt: alert.readAt,
  resolvedAt: alert.resolvedAt,
  resolveNote: alert.resolveNote,
});

// Unresolved alerts (unread first, then critical, then oldest) or the resolved
// history, newest first.
export async function listAlerts(area, searchParams) {
  const { noData, locations } = await sweepMonitoring(area);
  const resolved = searchParams.get("view") === "resolved";
  const location = searchParams.get("location");
  if (location && !positiveInteger(Number(location)))
    throw new HttpError(400, "Invalid location");
  const rows = await prisma.hallAlert.findMany({
    where: {
      area,
      resolvedAt: resolved ? { not: null } : null,
      ...(location && { locationId: Number(location) }),
    },
    orderBy: resolved ? [{ resolvedAt: "desc" }, { id: "desc" }] : [{ openedAt: "asc" }, { id: "asc" }],
    take: resolved ? 50 : undefined,
  });
  if (!resolved)
    rows.sort(
      (a, b) =>
        // Worst first: a critical alert stays on top after it has been read.
        (b.severity === "CRITICAL") - (a.severity === "CRITICAL") ||
        Boolean(a.readAt) - Boolean(b.readAt),
    );
  // Resolved alerts list what was wrong while they were open, worst first.
  const seen = new Map();
  if (resolved && rows.length) {
    const entries = await prisma.hallAlertEntry.findMany({
      where: { alertId: { in: rows.map((row) => row.id) }, type: { in: ["OPENED", "MEASURED", "OVERDUE"] } },
      select: { alertId: true, problems: true },
    });
    for (const entry of entries) {
      const list = seen.get(entry.alertId) || [];
      for (const problem of entry.problems || []) {
        const index = list.findIndex((row) => row.key === problem.key);
        if (index < 0) list.push(problem);
        else if (list[index].level === "warning" && problem.level === "danger") list[index] = problem;
      }
      seen.set(entry.alertId, list);
    }
  }
  return {
    alerts: rows.map((alert) => ({
      ...alertView(alert, locations),
      ...(resolved && {
        seen: (seen.get(alert.id) || []).sort((a, b) => (b.level === "danger") - (a.level === "danger")),
      }),
    })),
    noData: location ? noData.filter((row) => row.locationId === Number(location)) : noData,
  };
}

// An alert with its history, the people named in it and the hall's latest
// measurement.
export async function alertDetail(area, id) {
  if (!positiveInteger(id)) throw new HttpError(400, "Invalid alert");
  const { locations } = await sweepMonitoring(area);
  const alert = await prisma.hallAlert.findUniqueOrThrow({ where: { id } });
  if (alert.area !== area) throw new HttpError(404, "Alert not found");
  const entries = await prisma.hallAlertEntry.findMany({
    where: { alertId: id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, type: true, authorId: true, text: true, problems: true, createdAt: true },
  });
  const names = await recordNames({ users: entries.map((row) => row.authorId) });
  const config = AREAS[area];
  const [last] = await prisma[config.measurements].findMany({
    where: { [`${config.prefix}LocationId`]: alert.locationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  });
  const { get } = await effectiveRules(area, [alert.locationId]);
  return {
    alert: alertView(alert, locations),
    entries,
    people: peopleMap(names),
    latest: last
      ? {
          at: last.createdAt,
          values: MONITORING_PARAMETERS.map((parameter) => {
            const value = last[config.prefix + parameter.field];
            return {
              key: parameter.key,
              unit: parameter.unit,
              value,
              level: classify(get(alert.locationId, parameter.key), value),
            };
          }),
        }
      : null,
  };
}

// READ and RESOLVE are for Supervision and administrators; everyone with access
// to the area can write a MESSAGE. An alert is resolved only once its hall is
// back within range, i.e. it has no problems left.
export async function alertAction(area, body, user) {
  const { alertId, action } = body;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!positiveInteger(alertId) || !["READ", "MESSAGE", "RESOLVE"].includes(action))
    throw new HttpError(400, "Invalid alert action");
  if (text.length > MESSAGE_LIMIT || (action === "MESSAGE" && !text))
    throw new HttpError(400, `Write a message of up to ${MESSAGE_LIMIT} characters.`);
  if (action !== "MESSAGE" && !managers(user))
    throw new HttpError(403, "Only Supervision or an administrator can do this.");
  const alert = await prisma.hallAlert.findUniqueOrThrow({ where: { id: alertId } });
  if (alert.area !== area) throw new HttpError(404, "Alert not found");
  if (alert.resolvedAt) throw new HttpError(409, "This alert is already resolved.");
  const now = new Date();
  if (action === "READ") {
    if (alert.readAt) return { alert };
    const updated = await prisma.hallAlert.update({
      where: { id: alertId },
      data: { readAt: now, readById: user.id },
    });
    await prisma.hallAlertEntry.create({
      data: { alertId, type: "READ", authorId: user.id, createdAt: now },
    });
    return { alert: updated };
  }
  if (action === "RESOLVE") {
    if (alert.problems.length)
      throw new HttpError(409, "Resolve the alert once a new measurement is within range.");
    const updated = await prisma.hallAlert.update({
      where: { id: alertId },
      data: {
        resolvedAt: now,
        resolvedById: user.id,
        resolveNote: text || null,
        ...(!alert.readAt && { readAt: now, readById: user.id }),
      },
    });
    await prisma.hallAlertEntry.create({
      data: { alertId, type: "RESOLVED", authorId: user.id, text: text || null, createdAt: now },
    });
    return { alert: updated };
  }
  await prisma.hallAlertEntry.create({
    data: { alertId, type: "MESSAGE", authorId: user.id, text, createdAt: now },
  });
  return { alert };
}

export async function monitoringRules(area, searchParams) {
  const config = AREAS[area];
  const location = searchParams.get("location");
  if (location && !positiveInteger(Number(location)))
    throw new HttpError(400, "Invalid location");
  const locations = await prisma[config.locations].findMany({
    where: location ? { id: Number(location) } : {},
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });
  const ids = locations.map((row) => row.id);
  const { get, versions } = await effectiveRules(area, ids);
  return {
    locations: locations.map((row) => ({
      ...row,
      rules: Object.fromEntries(
        MONITORING_PARAMETERS.map((parameter) => [
          parameter.key,
          get(row.id, parameter.key),
        ]),
      ),
    })),
    versions: versions.map(
      ({ fingerprint: _fingerprint, actionKey: _actionKey, ...version }) =>
        version,
    ),
  };
}

// Administrator adds a new version; earlier versions and open alerts keep their values.
export async function saveMonitoringRule(area, body, user) {
  const {
    locationId,
    parameter,
    values,
    approvalReference,
    reason,
    expectedRuleId = null,
    actionKey,
  } = body;
  if (
    !positiveInteger(locationId) ||
    !DEFAULT_RULES[parameter] ||
    !values ||
    typeof values !== "object" ||
    (expectedRuleId !== null && !positiveInteger(expectedRuleId)) ||
    typeof actionKey !== "string" ||
    !ACTION_KEY.test(actionKey) ||
    [approvalReference, reason].some(
      (text) =>
        typeof text !== "string" ||
        text.trim().length < 3 ||
        text.trim().length > 1000,
    )
  )
    throw new HttpError(
      400,
      "Review the rule and give the confirmation reference and the reason (3–1000 characters each).",
    );
  const rule = Object.fromEntries(
    RULE_FIELDS.map((key) => [
      key,
      values[key] === "" || values[key] === undefined ? null : values[key],
    ]),
  );
  const problem = ruleProblem(rule);
  if (problem) throw new HttpError(400, problem);
  const fingerprint = hash([
    locationId,
    parameter,
    rule,
    approvalReference.trim(),
    reason.trim(),
    expectedRuleId,
    user.id,
  ]);
  const previous = await prisma.monitoringRule.findFirst({
    where: { actionKey },
  });
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        "This confirmation belongs to a different rule change.",
      );
    const { fingerprint: _stored, ...version } = previous;
    return { rule: version, replayed: true };
  }
  await prisma[AREAS[area].locations].findUniqueOrThrow({
    where: { id: locationId },
  });
  const current = (await effectiveRules(area, [locationId])).get(
    locationId,
    parameter,
  );
  if (current.ruleId !== expectedRuleId)
    throw new HttpError(
      409,
      "The rule changed after your review. Reload before saving.",
    );
  if (
    current.confirmed &&
    RULE_FIELDS.every((key) => current[key] === rule[key]) &&
    current.approvalReference === approvalReference.trim()
  )
    throw new HttpError(400, "No changes to save");
  const created = await prisma.monitoringRule.create({
    data: {
      area,
      locationId,
      parameter,
      ...rule,
      approvalReference: approvalReference.trim(),
      reason: reason.trim(),
      actorId: user.id,
      actionKey,
      fingerprint,
    },
  });
  const { fingerprint: _stored, actionKey: _key, ...version } = created;
  return { rule: version };
}

// Unresolved alerts of an area for counters and badges; runs the same evaluation first.
export async function monitoringSummary(area) {
  const { noData } = await sweepMonitoring(area);
  const open = await prisma.hallAlert.findMany({
    where: { area, resolvedAt: null },
    select: { id: true, locationId: true, severity: true, problems: true, readAt: true, openedAt: true },
  });
  return { open, noData };
}
