import { createHash } from "node:crypto";
import { prisma, positiveInteger } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
import {
  DEFAULT_RULES,
  ESCALATION,
  MONITORING_PARAMETERS,
  classify,
  parameterInfo,
  ruleProblem,
} from "../monitoring";
import { storageBalances } from "./storage-balances";

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
const managers = (user) => ["ADMINISTRATOR", "SUPERVISION"].includes(user.role);

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

const snapshot = (rule) => ({
  ...Object.fromEntries(RULE_FIELDS.map((key) => [key, rule[key]])),
  confirmed: rule.confirmed,
  ruleId: rule.ruleId,
});

async function record(
  alert,
  type,
  {
    actorId = null,
    measurementId = null,
    value = null,
    note = null,
    effectiveAt = new Date(),
    actionKey = null,
    fingerprint = null,
  } = {},
) {
  return prisma.conditionAlertEvent.create({
    data: {
      alertId: alert.id,
      type,
      actorId,
      measurementId,
      value,
      note,
      effectiveAt,
      actionKey,
      fingerprint,
    },
  });
}

function escalationDue(alert, now) {
  const at = (hours) =>
    new Date(new Date(alert.openedAt).getTime() + hours * HOUR);
  const after = (time, due) => !time || new Date(time) > due;
  const candidates = [];
  // A Critical alert escalates when the value became critical (opening or raise).
  if (alert.severity === "CRITICAL")
    candidates.push([
      new Date(alert.lastMeasuredAt || alert.openedAt),
      "Critical deviation",
    ]);
  else if (alert.kind === "OUT_OF_RANGE") {
    const unacknowledged = at(ESCALATION.unacknowledgedHours),
      lasting = at(ESCALATION.lastingHours);
    if (after(alert.acknowledgedAt, unacknowledged))
      candidates.push([
        unacknowledged,
        `Not acknowledged within ${ESCALATION.unacknowledgedHours} h`,
      ]);
    if (after(alert.clearedAt, lasting))
      candidates.push([
        lasting,
        `Outside range for more than ${ESCALATION.lastingHours} h`,
      ]);
    if (alert.measurementCount >= ESCALATION.consecutiveMeasurements)
      candidates.push([
        new Date(alert.lastMeasuredAt),
        `${ESCALATION.consecutiveMeasurements} or more consecutive measurements outside range`,
      ]);
  } else {
    const overdue = at(ESCALATION.overdueHours);
    if (after(alert.clearedAt, overdue))
      candidates.push([
        overdue,
        `No measurement within ${ESCALATION.overdueHours} h after it became overdue`,
      ]);
  }
  return (
    candidates.filter(([due]) => due <= now).sort((a, b) => a[0] - b[0])[0] ||
    null
  );
}

// Escalation is recorded with the moment its deadline passed, even when it is
// noticed later (there is no background job; evaluation happens on use).
async function applyEscalations(area, where = {}, now = new Date()) {
  const open = await prisma.conditionAlert.findMany({
    where: { area, closedAt: null, escalatedAt: null, ...where },
  });
  for (const alert of open) {
    const due = escalationDue(alert, now);
    if (!due) continue;
    const [effectiveAt, reason] = due;
    const updated = await prisma.conditionAlert.update({
      where: { id: alert.id },
      data: {
        escalatedAt: effectiveAt,
        escalationReason: reason,
        version: alert.version + 1,
      },
    });
    await record(updated, "ESCALATED", { note: reason, effectiveAt });
  }
}

// Called in the same transaction as a new measurement.
export async function evaluateMeasurement(area, row) {
  const config = AREAS[area];
  const locationId = row[`${config.prefix}LocationId`];
  const { get } = await effectiveRules(area, [locationId]);
  const outcomes = [];
  for (const parameter of MONITORING_PARAMETERS) {
    const rule = get(locationId, parameter.key);
    const value = row[config.prefix + parameter.field];
    const level = classify(rule, value);
    const at = row.createdAt;
    const key = { area, locationId, parameter: parameter.key, closedAt: null };
    const open = await prisma.conditionAlert.findFirst({
      where: { ...key, kind: "OUT_OF_RANGE" },
    });
    if (level === "warning" || level === "danger") {
      const severity = level === "danger" ? "CRITICAL" : "WARNING";
      if (open) {
        const raised = severity === "CRITICAL" && open.severity === "WARNING";
        const alert = await prisma.conditionAlert.update({
          where: { id: open.id },
          data: {
            lastValue: value,
            lastMeasuredAt: at,
            lastMeasurementId: row.id,
            measurementCount: open.measurementCount + 1,
            clearedAt: null,
            clearedByMeasurementId: null,
            version: open.version + 1,
            ...(raised && { severity }),
          },
        });
        await record(alert, "CONTINUED", {
          measurementId: row.id,
          value,
          effectiveAt: at,
        });
        if (raised)
          await record(alert, "SEVERITY_RAISED", {
            measurementId: row.id,
            value,
            effectiveAt: at,
            note: "Warning raised to Critical",
          });
        outcomes.push({
          alertId: alert.id,
          parameter: parameter.key,
          outcome: raised ? "raised" : "continued",
          severity: alert.severity,
        });
      } else {
        const alert = await prisma.conditionAlert.create({
          data: {
            area,
            locationId,
            parameter: parameter.key,
            kind: "OUT_OF_RANGE",
            severity,
            openedAt: at,
            rule: snapshot(rule),
            firstMeasurementId: row.id,
            lastMeasurementId: row.id,
            lastValue: value,
            lastMeasuredAt: at,
            measurementCount: 1,
          },
        });
        await record(alert, "OPENED", {
          measurementId: row.id,
          value,
          effectiveAt: at,
        });
        outcomes.push({
          alertId: alert.id,
          parameter: parameter.key,
          outcome: "opened",
          severity,
        });
      }
    } else if (level === "optimal" && open && !open.clearedAt) {
      const alert = await prisma.conditionAlert.update({
        where: { id: open.id },
        data: {
          clearedAt: at,
          clearedByMeasurementId: row.id,
          version: open.version + 1,
        },
      });
      await record(alert, "CONDITION_CLEARED", {
        measurementId: row.id,
        value,
        effectiveAt: at,
        note: "Back within range",
      });
      outcomes.push({
        alertId: alert.id,
        parameter: parameter.key,
        outcome: "cleared",
        severity: alert.severity,
      });
    }
    const missing = await prisma.conditionAlert.findFirst({
      where: { ...key, kind: "MISSING", clearedAt: null },
    });
    if (missing) {
      const alert = await prisma.conditionAlert.update({
        where: { id: missing.id },
        data: {
          clearedAt: at,
          clearedByMeasurementId: row.id,
          lastMeasurementId: row.id,
          lastMeasuredAt: at,
          version: missing.version + 1,
        },
      });
      await record(alert, "CONDITION_CLEARED", {
        measurementId: row.id,
        value,
        effectiveAt: at,
        note: "Measurement received",
      });
    }
  }
  await applyEscalations(area, { locationId }, new Date());
  return outcomes;
}

// Opens overdue alerts and records passed escalation deadlines for an area.
// Returns halls without any measurement: they are shown, never presented as in order.
export async function sweepMonitoring(area, now = new Date()) {
  const config = AREAS[area];
  const locations = await prisma[config.locations].findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      [config.relation]: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true, createdAt: true },
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
    for (const parameter of MONITORING_PARAMETERS) {
      const rule = get(location.id, parameter.key);
      const dueAt = new Date(
        new Date(last.createdAt).getTime() + rule.intervalHours * HOUR,
      );
      if (now < dueAt) continue;
      const open = await prisma.conditionAlert.findFirst({
        where: {
          area,
          locationId: location.id,
          parameter: parameter.key,
          kind: "MISSING",
          closedAt: null,
        },
      });
      const note = `No measurement within ${rule.intervalHours} h after measurement #${last.id}`;
      if (!open) {
        const alert = await prisma.conditionAlert.create({
          data: {
            area,
            locationId: location.id,
            parameter: parameter.key,
            kind: "MISSING",
            severity: "WARNING",
            openedAt: dueAt,
            rule: snapshot(rule),
            lastMeasurementId: last.id,
            lastMeasuredAt: last.createdAt,
          },
        });
        await record(alert, "OPENED", { effectiveAt: dueAt, note });
      } else if (open.clearedAt && dueAt > new Date(open.clearedAt)) {
        const alert = await prisma.conditionAlert.update({
          where: { id: open.id },
          data: {
            clearedAt: null,
            clearedByMeasurementId: null,
            lastMeasurementId: last.id,
            lastMeasuredAt: last.createdAt,
            version: open.version + 1,
          },
        });
        await record(alert, "CONTINUED", {
          effectiveAt: dueAt,
          note: `${note} (overdue again)`,
        });
      }
    }
  }
  await applyEscalations(area, {}, now);
  return { noData, locations };
}

const alertView = (alert, locations) => ({
  ...alert,
  locationName:
    locations.find((location) => location.id === alert.locationId)?.name ||
    `Hall #${alert.locationId}`,
  unit: parameterInfo(alert.parameter)?.unit,
  label: parameterInfo(alert.parameter)?.label,
});

export async function listAlerts(area, searchParams) {
  const { noData, locations } = await sweepMonitoring(area);
  const view = searchParams.get("view") === "closed" ? "closed" : "open";
  const location = searchParams.get("location");
  if (location && !positiveInteger(Number(location)))
    throw new HttpError(400, "Invalid location");
  const where = {
    area,
    closedAt: view === "open" ? null : { not: null },
    ...(location && { locationId: Number(location) }),
  };
  const total = await prisma.conditionAlert.count({ where });
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1),
  );
  // Open alerts: most severe and escalated first, then oldest; closed: newest closure first.
  const orderBy =
    view === "open"
      ? [
          { severity: "desc" },
          { escalatedAt: { sort: "asc", nulls: "last" } },
          { openedAt: "asc" },
          { id: "asc" },
        ]
      : [{ closedAt: "desc" }, { id: "desc" }];
  const alerts = await prisma.conditionAlert.findMany({
    where,
    orderBy,
    skip: (page - 1) * 10,
    take: 10,
  });
  const openAll = await prisma.conditionAlert.findMany({
    where: { area, closedAt: null },
    select: { severity: true, escalatedAt: true },
  });
  return {
    alerts: alerts.map((alert) => alertView(alert, locations)),
    page,
    pages,
    total,
    view,
    counts: {
      open: openAll.length,
      escalated: openAll.filter((row) => row.escalatedAt).length,
      critical: openAll.filter((row) => row.severity === "CRITICAL").length,
    },
    noData: location
      ? noData.filter((row) => row.locationId === Number(location))
      : noData,
    locations: locations.map(({ id, name }) => ({ id, name })),
  };
}

export async function alertDetail(area, id) {
  if (!positiveInteger(id)) throw new HttpError(400, "Invalid alert");
  const { locations } = await sweepMonitoring(area);
  const alert = await prisma.conditionAlert.findUniqueOrThrow({
    where: { id },
  });
  if (alert.area !== area) throw new HttpError(404, "Alert not found");
  const events = await prisma.conditionAlertEvent.findMany({
    where: { alertId: id },
    orderBy: [{ effectiveAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      type: true,
      actorId: true,
      measurementId: true,
      value: true,
      note: true,
      effectiveAt: true,
      createdAt: true,
    },
  });
  return {
    alert: alertView(alert, locations),
    events,
    ...(await alertContext(area, alert)),
  };
}

const SERIES_HOURS = 72,
  SERIES_LIMIT = 150;
const slots = (row) =>
  row.containerFootprint > 0
    ? Math.floor(row.surfaceArea / row.containerFootprint)
    : 0;

// What an alert is judged against: the recorded measurements of its parameter
// from three days before it opened until it closed (or now), classified with the
// rule snapshot of the alert; the latest measurement of every parameter with the
// current rules; and the occupancy of the hall or room. Only recorded values –
// nothing is interpolated between measurements.
async function alertContext(area, alert) {
  const config = AREAS[area];
  const field = config.prefix + parameterInfo(alert.parameter).field;
  const from = new Date(
    new Date(alert.openedAt).getTime() - SERIES_HOURS * HOUR,
  );
  const until = alert.closedAt ? new Date(alert.closedAt) : new Date();
  const rows = await prisma[config.measurements].findMany({
    where: {
      [`${config.prefix}LocationId`]: alert.locationId,
      createdAt: { gte: from, lte: until },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: SERIES_LIMIT,
  });
  const series = rows
    .reverse()
    .map((row) => ({
      id: row.id,
      at: row.createdAt,
      value: row[field],
      level: classify(alert.rule, row[field]),
    }));
  const [last] = await prisma[config.measurements].findMany({
    where: { [`${config.prefix}LocationId`]: alert.locationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  });
  const { get } = await effectiveRules(area, [alert.locationId]);
  const latest = last
    ? {
        id: last.id,
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
    : null;
  const balances = await storageBalances();
  const row = (area === "PRE_STORAGE" ? balances.pre : balances.final).find(
    (item) => item.id === alert.locationId,
  );
  const location = row
    ? {
        id: row.id,
        name: row.name,
        used: row.inventory.quantity,
        slots: slots(row),
      }
    : null;
  return {
    series,
    seriesFrom: from,
    seriesTruncated: rows.length === SERIES_LIMIT,
    latest,
    location,
  };
}

// Acknowledge, note or close. The reviewed version guards against acting on a changed alert.
export async function alertAction(area, body, user) {
  const { alertId, action, note = "", expectedVersion, actionKey } = body;
  const needsNote = action === "NOTE" || action === "CLOSE";
  if (
    !positiveInteger(alertId) ||
    !["ACKNOWLEDGE", "NOTE", "CLOSE"].includes(action) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    typeof actionKey !== "string" ||
    !ACTION_KEY.test(actionKey) ||
    typeof note !== "string" ||
    note.trim().length > 1000 ||
    (needsNote && note.trim().length < 3)
  )
    throw new HttpError(
      400,
      needsNote
        ? "Describe what was checked or done (3–1000 characters)."
        : "Review the alert before confirming.",
    );
  const fingerprint = hash([
    alertId,
    action,
    note.trim(),
    expectedVersion,
    user.id,
  ]);
  const previous = await prisma.conditionAlertEvent.findFirst({
    where: { actionKey },
  });
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        "This confirmation belongs to a different alert action.",
      );
    const { fingerprint: _stored, actionKey: _key, ...event } = previous;
    return {
      event,
      alert: await prisma.conditionAlert.findUniqueOrThrow({
        where: { id: alertId },
      }),
      replayed: true,
    };
  }
  const current = await prisma.conditionAlert.findUniqueOrThrow({
    where: { id: alertId },
  });
  if (current.area !== area) throw new HttpError(404, "Alert not found");
  if (current.version !== expectedVersion)
    throw new HttpError(
      409,
      "The alert changed after your review (for example a new measurement or escalation). Reload before acting.",
    );
  if (current.closedAt)
    throw new HttpError(
      409,
      "This alert is already closed. A new deviation opens a new alert.",
    );
  await applyEscalations(area, { id: alertId });
  const alert = await prisma.conditionAlert.findUniqueOrThrow({
    where: { id: alertId },
  });
  const now = new Date();
  let updated = alert;
  if (action === "ACKNOWLEDGE") {
    if (alert.acknowledgedAt)
      throw new HttpError(
        409,
        `Already acknowledged by User #${alert.acknowledgedById}.`,
      );
    updated = await prisma.conditionAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: now,
        acknowledgedById: user.id,
        version: alert.version + 1,
      },
    });
  } else if (action === "CLOSE") {
    if (alert.severity === "CRITICAL" && !managers(user))
      throw new HttpError(
        403,
        "Only Supervision or an administrator can close a Critical alert.",
      );
    if (!alert.clearedAt)
      throw new HttpError(
        409,
        alert.kind === "MISSING"
          ? "Close only after a new measurement has been recorded."
          : "Close only after a control measurement within range has been recorded.",
      );
    updated = await prisma.conditionAlert.update({
      where: { id: alertId },
      data: {
        closedAt: now,
        closedById: user.id,
        closeNote: note.trim(),
        version: alert.version + 1,
      },
    });
  }
  const {
    fingerprint: _stored,
    actionKey: _key,
    ...event
  } = await record(
    updated,
    action === "ACKNOWLEDGE"
      ? "ACKNOWLEDGED"
      : action === "NOTE"
        ? "NOTE"
        : "CLOSED",
    {
      actorId: user.id,
      note: note.trim() || null,
      effectiveAt: now,
      actionKey,
      fingerprint,
    },
  );
  return { event, alert: updated };
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

// Counts for the home page; runs the same evaluation first.
export async function monitoringSummary(area) {
  const { noData } = await sweepMonitoring(area);
  const open = await prisma.conditionAlert.findMany({
    where: { area, closedAt: null },
    select: {
      id: true,
      severity: true,
      escalatedAt: true,
      parameter: true,
      locationId: true,
      kind: true,
      openedAt: true,
    },
  });
  return { open, noData };
}
