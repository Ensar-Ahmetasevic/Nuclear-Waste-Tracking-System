const { HttpError } = require('./errors.cjs');
const { positiveInteger } = require('./scoped-database.cjs');
function registrationData(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid registration');
  const { email, password, companyName, address } = body;
  const companyId = typeof body.companyId === 'string' && /^\d+$/.test(body.companyId) ? Number(body.companyId) : body.companyId;
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email is required');
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Password must contain at least 12 characters and at most 72 UTF-8 bytes');
  if (!positiveInteger(companyId)) throw new HttpError(400, 'A valid company number is required');
  for (const value of [companyName, address]) {
    if (typeof value !== 'string' || !value.trim() || value.length > 300) throw new HttpError(400, 'Company name and address are required (maximum 300 characters)');
  }
  // Company numbers are descriptive information, never proof of membership.
  return { email: email.toLowerCase(), password, companyName: companyName.trim(), companyId, address: address.trim(), administrator: false, active: false, organizationId: null };
}
module.exports = { registrationData };
