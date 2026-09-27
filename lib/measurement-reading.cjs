// Values read from a measuring device instead of typed. The person must confirm
// every value that came from the device before the measurement is saved.
const FIELDS = ["Temperature", "RadiationLevel", "Humidity", "Pressure"];
const METHODS = ["BLUETOOTH", "CODE"];

// Keys a device code may use for each field (case-insensitive).
const ALIASES = {
  Temperature: ["t", "temp", "temperature"],
  RadiationLevel: ["rad", "radiation", "dose", "doserate"],
  Humidity: ["h", "hum", "humidity", "rh"],
  Pressure: ["p", "pres", "pressure"],
};
const DEVICE_KEYS = ["dev", "device", "id", "serial"];

const fieldOf = (key) =>
  FIELDS.find((field) => ALIASES[field].includes(String(key).toLowerCase()));

// A code shown by a device: "NWTS-M;DEV=TH-204;T=18.4;RAD=0.06;H=47;P=1014"
// (any order, ";" or new lines between pairs; "," may be a decimal comma) or the same as JSON.
// Returns { device, values } with the recognised fields, or null.
function parseDeviceCode(text) {
  const value = String(text ?? "").trim();
  if (!value || value.length > 2000) return null;
  let pairs;
  if (value.startsWith("{")) {
    try {
      pairs = Object.entries(JSON.parse(value));
    } catch {
      return null;
    }
  } else {
    const parts = value.split(/[;\n]+/).map((part) => part.trim()).filter(Boolean);
    if (/^nwts-m$/i.test(parts[0] || "")) parts.shift();
    pairs = parts.map((part) => {
      const index = part.search(/[=:]/);
      return index > 0 ? [part.slice(0, index).trim(), part.slice(index + 1).trim()] : [part, ""];
    });
  }
  const values = {};
  let device = null;
  for (const [key, raw] of pairs) {
    if (DEVICE_KEYS.includes(String(key).toLowerCase())) {
      device = String(raw).slice(0, 100) || null;
      continue;
    }
    const field = fieldOf(key);
    const number = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
    if (field && String(raw).trim() !== "" && Number.isFinite(number)) values[field] = number;
  }
  return Object.keys(values).length ? { device, values } : null;
}

// Server check of the reading source sent with a measurement: one entry per
// value read from a device ({ field, method, device }), each confirmed by the
// person saving it. Returns a message for the person, or null.
function readingSourceProblem(source) {
  if (source == null) return null;
  if (typeof source !== "object" || Array.isArray(source)) return "Invalid device reading";
  const readings = Array.isArray(source.readings) ? source.readings : [];
  const confirmed = Array.isArray(source.confirmed) ? source.confirmed : [];
  const fields = readings.map((row) => row?.field);
  if (
    !readings.length ||
    new Set(fields).size !== fields.length ||
    readings.some(
      (row) =>
        !FIELDS.includes(row?.field) ||
        !METHODS.includes(row.method) ||
        (row.device != null && (typeof row.device !== "string" || row.device.length > 100)),
    )
  )
    return "Invalid device reading";
  if (fields.some((field) => !confirmed.includes(field)))
    return "Confirm every value read from the device before saving";
  return null;
}

// The stored form: device readings in field order, without confirmations.
function storedReadingSource(source) {
  if (source == null) return null;
  return {
    readings: FIELDS.flatMap((field) => {
      const row = source.readings.find((item) => item.field === field);
      return row ? [{ field, method: row.method, device: row.device || null }] : [];
    }),
  };
}

// Device names of a stored reading source (also the earlier single-device form).
function readingDevices(source) {
  if (!source) return [];
  const devices = source.readings ? source.readings.map((row) => row.device) : [source.device];
  return [...new Set(devices)];
}

module.exports = { FIELDS, METHODS, parseDeviceCode, readingSourceProblem, storedReadingSource, readingDevices };
