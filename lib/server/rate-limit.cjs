const { createHash } = require('node:crypto');
const { database } = require('./database.cjs');
const { HttpError } = require('./errors.cjs');
async function rateLimit(action, subject, limit, windowMs = 15 * 60 * 1000) {
  const bucket = Math.floor(Date.now() / windowMs);
  const digest = createHash('sha256').update(String(subject)).digest('hex');
  const key = `${action}:${bucket}:${digest}`;
  const record = await database.authRateLimit.upsert({
    where: { key }, create: { key, attempts: 1, expiresAt: new Date((bucket + 1) * windowMs) },
    update: { attempts: { increment: 1 } }, select: { attempts: true },
  });
  await database.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (record.attempts > limit) throw new HttpError(429, 'Too many attempts. Try again later.');
}
module.exports = { rateLimit };
