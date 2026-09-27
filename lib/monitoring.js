// Shared by the monitoring API and the UI so a value is classified the same way
// everywhere. Default values are the ranges the application used before rules
// became configurable; they are not confirmed limits.
export const MONITORING_PARAMETERS = [
  { key: "TEMPERATURE", field: "Temperature", label: "Temperature", unit: "°C" },
  { key: "RADIATION", field: "RadiationLevel", label: "Radiation", unit: "µSv/h" },
  { key: "HUMIDITY", field: "Humidity", label: "Humidity", unit: "%" },
  { key: "PRESSURE", field: "Pressure", label: "Pressure", unit: "hPa" },
];

export const DEFAULT_RULES = {
  TEMPERATURE: { lowerDanger: -25, lowerWarning: -5, upperWarning: 35, upperDanger: 40, intervalHours: 24 },
  RADIATION: { lowerDanger: null, lowerWarning: null, upperWarning: 0.1, upperDanger: 0.5, intervalHours: 12 },
  HUMIDITY: { lowerDanger: 30, lowerWarning: 40, upperWarning: 60, upperDanger: 70, intervalHours: 24 },
  PRESSURE: { lowerDanger: 1000, lowerWarning: 1010, upperWarning: 1020, upperDanger: 1030, intervalHours: 24 },
};

// Escalation deadlines agreed on 24.09.2026, counted in calendar hours.
export const ESCALATION = { unacknowledgedHours: 2, lastingHours: 24, consecutiveMeasurements: 3, overdueHours: 2 };

export const parameterInfo = key => MONITORING_PARAMETERS.find(parameter => parameter.key === key);

// "optimal" inside the range (bounds included); "danger" at or below the lower
// danger bound or above the upper one; "warning" in between.
export function classify(rule, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || !rule) return "unknown";
  if ((rule.lowerDanger != null && value <= rule.lowerDanger) || (rule.upperDanger != null && value > rule.upperDanger)) return "danger";
  if ((rule.lowerWarning == null || value >= rule.lowerWarning) && (rule.upperWarning == null || value <= rule.upperWarning)) return "optimal";
  return "warning";
}

// Returns an error message, or null when the bounds are ordered and complete.
export function ruleProblem(rule) {
  const numbers = ["lowerDanger", "lowerWarning", "upperWarning", "upperDanger"];
  if (numbers.some(key => rule[key] != null && (typeof rule[key] !== "number" || !Number.isFinite(rule[key])))) return "Range values must be numbers";
  if (!Number.isSafeInteger(rule.intervalHours) || rule.intervalHours < 1 || rule.intervalHours > 720) return "The expected interval must be 1–720 whole hours";
  if (rule.lowerWarning == null && rule.upperWarning == null) return "Give at least one bound of the acceptable range";
  if (rule.lowerDanger != null && rule.lowerWarning == null) return "A lower danger bound needs a lower range bound";
  if (rule.upperDanger != null && rule.upperWarning == null) return "An upper danger bound needs an upper range bound";
  if (rule.lowerWarning != null && rule.upperWarning != null && rule.lowerWarning > rule.upperWarning) return "The lower range bound must not exceed the upper one";
  if (rule.lowerDanger != null && rule.lowerDanger >= rule.lowerWarning) return "The lower danger bound must be below the lower range bound";
  if (rule.upperDanger != null && rule.upperDanger <= rule.upperWarning) return "The upper danger bound must be above the upper range bound";
  return null;
}

export function ruleText(rule, unit) {
  const within = rule.lowerWarning != null && rule.upperWarning != null
    ? `${rule.lowerWarning} to ${rule.upperWarning} ${unit}`
    : rule.lowerWarning != null ? `${rule.lowerWarning} ${unit} or more` : `up to ${rule.upperWarning} ${unit}`;
  const danger = [rule.lowerDanger != null && `at or below ${rule.lowerDanger}`, rule.upperDanger != null && `above ${rule.upperDanger}`].filter(Boolean).join(" or ");
  return `Within range: ${within}. ${danger ? `Danger: ${danger} ${unit}. ` : ""}Warning otherwise. Expected every ${rule.intervalHours} h.`;
}

export const LEVEL_LABELS = { optimal: "Within range", warning: "Warning", danger: "Danger", unknown: "Not available" };
export const SEVERITY_LABELS = { WARNING: "Warning", CRITICAL: "Critical" };
export const KIND_LABELS = { OUT_OF_RANGE: "Outside range", MISSING: "Measurement overdue" };
export const EVENT_LABELS = {
  OPENED: "Opened", CONTINUED: "Continued", SEVERITY_RAISED: "Severity raised", CONDITION_CLEARED: "Condition cleared",
  ACKNOWLEDGED: "Acknowledged", NOTE: "Note", ESCALATED: "Escalated to Supervision", CLOSED: "Closed",
};
