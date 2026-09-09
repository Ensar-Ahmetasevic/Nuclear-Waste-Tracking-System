const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registrationData } = require('../lib/server/registration.cjs');
const { prisma } = require('../lib/server/scoped-database.cjs');
const valid = { email: 'USER@example.com', password: 'a-long-test-password', companyName: 'Example', address: 'Address', companyId: '123' };
test('registration cannot choose privileges or membership', () => {
  const data = registrationData({ ...valid, administrator: true, active: true, organizationId: 42 });
  assert.equal(data.administrator, false); assert.equal(data.active, false); assert.equal(data.organizationId, null); assert.equal(data.email, 'user@example.com');
});
test('registration rejects malformed identifiers and bcrypt truncation', () => {
  for (const companyId of ['1x', '-1', '1.5', 0, 2147483648]) assert.throws(() => registrationData({ ...valid, companyId }), { status: 400 });
  assert.throws(() => registrationData({ ...valid, password: 'č'.repeat(37) }), { status: 400 });
});
test('unscoped business access fails closed', () => assert.throws(() => prisma.shippingInformation, /authenticated organization/));
const { validateRequestValues, readJson } = require('../lib/server/request-validation.cjs');
test('request validation rejects partially numeric IDs and nested privilege injection', () => {
  for (const body of [{ id: '12oops' }, { data: { organizationId: 2 } }, { preparedData: { quantity: '2.5' } }]) assert.throws(() => validateRequestValues(body), { status: 400 });
  validateRequestValues({ data: { id: '12', quantity: '2' } });
});
test('request reader bounds body size and rejects non-object JSON', async () => {
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(70000) }) })), { status: 413 });
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '[]' })), { status: 400 });
});
