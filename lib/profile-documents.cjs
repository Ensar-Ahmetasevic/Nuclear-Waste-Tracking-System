// What a Container Profile document may be, shared by the upload form and the
// server. The server recognises the file by its first bytes, not by its name.
const DOCUMENT_KINDS = ["TRANSPORT", "MEASUREMENT", "INSPECTION", "CHARACTERIZATION", "APPROVAL", "OTHER"];
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const SIGNATURES = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
];
const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";

// PDF, PNG or JPEG, or null for anything else.
function documentType(bytes) {
  const found = SIGNATURES.find(([, signature]) => signature.every((byte, index) => bytes[index] === byte));
  return found ? found[0] : null;
}

// The name as shown and downloaded: no path, no control characters.
function documentName(value) {
  const name = [...String(value ?? "").split(/[\\/]/).pop()]
    .filter((char) => char !== '"' && char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127)
    .join("")
    .trim();
  return name && name.length <= 150 ? name : null;
}

module.exports = { DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, DOCUMENT_ACCEPT, documentType, documentName };
