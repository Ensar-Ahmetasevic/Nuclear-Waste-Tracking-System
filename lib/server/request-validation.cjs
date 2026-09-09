const { HttpError } = require('./errors.cjs');
function validateRequestValues(value, depth = 0) {
  if (depth > 12) throw new HttpError(400, 'Request is too deeply nested');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['organizationId', 'administrator', 'active', '__proto__', 'constructor', 'prototype'].includes(key)) throw new HttpError(400, `Field ${key} is not accepted`);
    if (/^(id|.*Id|.*ID)$/.test(key) && child != null) {
      if (!/^[1-9]\d*$/.test(String(child)) || !Number.isSafeInteger(Number(child)) || Number(child) > 2147483647) throw new HttpError(400, `Invalid ${key}`);
    }
    if (/quantity/i.test(key) && child != null && (!/^\d+$/.test(String(child)) || !Number.isSafeInteger(Number(child)) || Number(child) > 2147483647)) throw new HttpError(400, `Invalid ${key}`);
    validateRequestValues(child, depth + 1);
  }
}
async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'JSON body is required');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new HttpError(413, 'Request body is too large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'A JSON object is required');
  return body;
}
module.exports = { validateRequestValues, readJson };
