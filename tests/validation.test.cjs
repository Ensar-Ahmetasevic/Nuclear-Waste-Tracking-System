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

const { shipmentGroup, newestShipments } = require('../lib/shipping-overview.cjs');
test('shipping overview follows insertion order even with backdated arrivals', () => {
  const trucks = [{ id: 5, entryDateTime: '2026-09-11T12:00:52Z' }, { id: 6, entryDateTime: '2026-09-11T09:29:41Z' }];
  assert.deepEqual(newestShipments(trucks).map(t => t.id), [6, 5]);
  assert.equal(trucks[0].id, 5);
});
test('departed trucks stay OUT even without content; pending profiles count as recorded', () => {
  assert.equal(shipmentGroup({ truckStatus: 'OUT', containerProfiles: [] }), 'out');
  assert.equal(shipmentGroup({ truckStatus: 'IN', containerProfiles: [] }), 'missing');
  assert.equal(shipmentGroup({ truckStatus: 'IN', containerProfiles: [{ containerStatus: 'pending', quantity: 15 }] }), 'recorded');
});

const { apiAllowed, pageAllowed } = require('../lib/workspaces.cjs');
test('workspace policy blocks cross-step data and separates transfer directions', () => {
  const shipping = {role:'EMPLOYEE',workArea:'SHIPPING'};
  const pre = {role:'EMPLOYEE',workArea:'PRE_STORAGE'};
  const final = {role:'EMPLOYEE',workArea:'FINAL_STORAGE'};
  assert.equal(apiAllowed(shipping,'/api/pre-storage-setup','GET'),false);
  assert.equal(apiAllowed(pre,'/api/shipping-informations','GET'),false);
  assert.equal(apiAllowed(pre,'/api/shipping-informations/pending','GET'),true);
  assert.equal(apiAllowed(final,'/api/shipping-informations/pending','GET'),false);
  assert.equal(apiAllowed(shipping,'/api/container-profile','POST'),false);
  assert.equal(apiAllowed(pre,'/api/pre-storage-setup/pre-storage-location','PUT'),false);
  const path='/api/final-storage-setup/final-storage-transver-request';
  for(const actor of [pre,final]) {
    assert.equal(apiAllowed(actor,path,'PUT',{operationType:'PRE_STORAGE_ACCEPT_REQUEST'}),actor===pre);
    assert.equal(apiAllowed(actor,path,'PUT',{operationType:'FINAL_STORAGE_ACCEPT_RESPONSE'}),actor===final);
  }
  assert.equal(pageAllowed(pre,'/final-storage/1'),false);
  assert.equal(pageAllowed(pre,'/pre-storage/setup'),false);
  assert.equal(apiAllowed({role:'EMPLOYEE'},'/api/shipping-informations','GET'),false);
});
