// One visible code per record, the same on screen, in search, on printed labels
// and when scanned: S-000025 for shipment 25, P-00202 for Container Profile 202
// (the formats of the Concept doc). Scans also accept the earlier NWTS-S-25 and
// short forms such as "S 25".
const KINDS = {
  shipment: { letter: "S", digits: 6, path: "/shipping-informations/" },
  profile: { letter: "P", digits: 5, path: "/profiles/" },
};

const recordCode = (kind, id) =>
  `${KINDS[kind].letter}-${String(id).padStart(KINDS[kind].digits, "0")}`;
const recordPath = (kind, id) => `${KINDS[kind].path}${id}`;

const validId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Reads what a camera, a hand scanner or a person entered. Only record codes
// and record links are accepted, and the result is always a path inside this
// app: a label never sends anyone to another host. `foreignHost` is set when a
// link was printed on another address, so the page can ask before opening the
// record with the same number here.
function parseScan(text, origin) {
  const value = String(text ?? "").trim();
  if (!value || value.length > 2048) return null;
  const code = /^(?:NWTS[\s-]*)?([SP])[\s-]*(\d{1,12})$/i.exec(value);
  if (code) {
    const kind = code[1].toUpperCase() === "S" ? "shipment" : "profile";
    const id = validId(code[2]);
    return id
      ? { kind, id, path: recordPath(kind, id), foreignHost: null }
      : null;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const link = /^\/(shipping-informations|profiles)\/(\d{1,12})\/?$/.exec(
    url.pathname,
  );
  const id = link && validId(link[2]);
  if (!id) return null;
  const kind = link[1] === "profiles" ? "profile" : "shipment";
  return {
    kind,
    id,
    path: recordPath(kind, id),
    foreignHost: url.origin === origin ? null : url.host,
  };
}

// A search entry that names one shipment: S-000025, 000025, NWTS-S-25, S 25 or #25.
// A plain number without leading zeros is not a code; it may be part of plates.
function shipmentSearchId(text) {
  const value = String(text ?? "").trim();
  const code = /^(?:(?:NWTS[\s-]*)?S[\s-]*|#\s*)(\d{1,12})$/i.exec(value) || /^(0\d{0,11})$/.exec(value);
  return code ? validId(code[1]) : null;
}

module.exports = { KINDS, recordCode, recordPath, parseScan, shipmentSearchId };
