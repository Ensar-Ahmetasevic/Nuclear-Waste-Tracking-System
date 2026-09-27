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
test('shipment journey follows the recorded data', async () => {
  const { shipmentJourney } = await import('../lib/shipment-journey.js');
  const states = journey => journey.steps.map(step => step.state).join(',');
  const entryDateTime = '2026-09-24T08:12:00Z';
  const profile = (containerStatus, quantity = 10) => ({ containerStatus, quantity, createdAt: '2026-09-24T08:40:00Z' });
  // A new arrival waits for its content.
  let journey = shipmentJourney({ truckStatus: 'IN', entryDateTime });
  assert.equal(journey.current, 'content');
  assert.equal(states(journey), 'done,current,upcoming,upcoming,upcoming');
  // Receipt is in progress until every profile is accepted.
  journey = shipmentJourney({ truckStatus: 'IN', entryDateTime, containerProfiles: [profile('accepted', 15), profile('pending', 12)] });
  assert.equal(states(journey), 'done,done,current,upcoming,upcoming');
  assert.deepEqual(journey.steps[2].progress, { done: 15, total: 27 });
  // A rejected profile blocks the receipt step.
  journey = shipmentJourney({ truckStatus: 'IN', entryDateTime, containerProfiles: [profile('rejected')] });
  assert.equal(journey.steps[2].state, 'blocked');
  // A linked receipt record counts even when an older status flag is still pending.
  assert.equal(shipmentJourney({ truckStatus: 'IN', entryDateTime, containerProfiles: [{ ...profile('pending'), receiptRecorded: true }] }).steps[2].state, 'done');
  // A departure is shown as done even when a receipt is still open.
  journey = shipmentJourney({ truckStatus: 'OUT', entryDateTime, exitDateTime: '2026-09-24T10:00:00Z', containerProfiles: [profile('pending')] });
  assert.equal(states(journey), 'done,done,current,done,upcoming');
  // Final storage is complete only when linked transfers carried every received container.
  const received = [profile('accepted', 15)];
  assert.equal(shipmentJourney({ truckStatus: 'OUT', entryDateTime, containerProfiles: received, finalContainers: 10 }).steps[4].state, 'current');
  journey = shipmentJourney({ truckStatus: 'OUT', entryDateTime, containerProfiles: received, finalContainers: 15 });
  assert.equal(journey.current, null);
  assert.equal(states(journey), 'done,done,done,done,done');
  // Without linked transfers final storage is not claimed.
  assert.equal(shipmentJourney({ truckStatus: 'OUT', entryDateTime, containerProfiles: received, finalContainers: 0 }).steps[4].tracked, false);
});

const { GROUPS, permissionMatrix } = require('../lib/permission-matrix.cjs');
// The matrix repeats each route's withApiAuth options; read them from the route
// files with the TypeScript parser so a changed route fails this test.
function routeOptions(apiPath, method) {
  const ts = require('typescript');
  const fs = require('node:fs'), path = require('node:path');
  let dir = path.join(__dirname, '..', 'app');
  for (const part of apiPath.split('/').filter(Boolean)) {
    const next = path.join(dir, part);
    if (fs.existsSync(next)) { dir = next; continue; }
    const dynamic = fs.readdirSync(dir).find(name => /^\[[^.]+\]$/.test(name));
    assert.ok(dynamic, `no route directory for ${apiPath}`);
    dir = path.join(dir, dynamic);
  }
  const file = path.join(dir, 'route.js');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const constants = new Map();
  let call;
  source.forEachChild(node => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      constants.set(declaration.name.getText(), declaration.initializer);
      if (declaration.name.getText() === method && declaration.initializer && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText() === 'withApiAuth') call = declaration.initializer;
    }
  });
  assert.ok(call, `${apiPath} does not export ${method} through withApiAuth`);
  let options = call.arguments[1];
  if (options && ts.isIdentifier(options)) options = constants.get(options.text);
  const result = {};
  for (const property of options?.properties || []) {
    const name = property.name.getText();
    if (name === 'access') result.access = property.initializer.text;
    if (name === 'allowedRoles') result.allowedRoles = property.initializer.elements.map(element => element.text);
  }
  return result;
}
test('permission matrix repeats the options of every route it describes', () => {
  for (const group of GROUPS) for (const action of group.actions) {
    if (!action.request) continue;
    const [method, apiPath] = action.request;
    const options = routeOptions(apiPath, method);
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (!read) assert.equal(action.access || 'admin', options.access || 'admin', `${action.key}: access`);
    assert.deepEqual(action.allowedRoles || null, options.allowedRoles || null, `${action.key}: allowedRoles`);
  }
});
test('permission matrix reflects the policy for roles and work areas', () => {
  const matrix = permissionMatrix();
  const cell = (key, subject) => matrix.groups.flatMap(group => group.actions).find(action => action.key === key).cells[subject];
  assert.deepEqual(matrix.subjects.map(subject => subject.key), ['ADMINISTRATOR', 'SUPERVISION', 'SHIPPING', 'PRE_STORAGE', 'FINAL_STORAGE']);
  assert.equal(cell('shipping.record', 'SHIPPING'), 'yes');
  assert.equal(cell('shipping.record', 'PRE_STORAGE'), 'no');
  assert.equal(cell('pre.approve', 'PRE_STORAGE'), 'yes');
  assert.equal(cell('pre.approve', 'FINAL_STORAGE'), 'no');
  assert.equal(cell('final.receive', 'FINAL_STORAGE'), 'yes');
  assert.equal(cell('pre.alerts', 'PRE_STORAGE'), 'limited');
  assert.equal(cell('pre.halls', 'SUPERVISION'), 'no');
  assert.equal(cell('users.edit', 'SUPERVISION'), 'no');
  assert.equal(cell('users.create', 'SUPERVISION'), 'limited');
  assert.equal(cell('trace.transfer', 'SHIPPING'), 'no');
  assert.equal(cell('trace.custody', 'SHIPPING'), 'yes');
  assert.equal(cell('scan', 'FINAL_STORAGE'), 'yes');
});

const { parseScan, recordCode, shipmentSearchId } = require('../lib/record-codes.cjs');
test('label scans open only NWTS records, and only inside this app', () => {
  const origin = 'https://nwts.example';
  assert.equal(recordCode('profile', 34), 'P-00034');
  assert.equal(recordCode('shipment', 25), 'S-000025');
  assert.equal(recordCode('shipment', 1234567), 'S-1234567');
  assert.equal(parseScan('S-000025', origin).path, '/shipping-informations/25');
  assert.equal(parseScan('p-00202', origin).path, '/profiles/202');
  assert.equal(parseScan('NWTS-S-25', origin).path, '/shipping-informations/25');
  for (const value of ['S-000025', 's-000025', '000025', 'NWTS-S-25', 'S 25', '#25']) assert.equal(shipmentSearchId(value), 25, value);
  for (const value of ['25', '5047', 'Transport', 'P-00025', 'S-0', '']) assert.equal(shipmentSearchId(value), null, value);
  assert.deepEqual(parseScan(' nwts-p-34 ', origin), { kind: 'profile', id: 34, path: '/profiles/34', foreignHost: null });
  assert.equal(parseScan('S 12', origin).path, '/shipping-informations/12');
  assert.equal(parseScan('https://nwts.example/profiles/34', origin).foreignHost, null);
  assert.deepEqual(parseScan('http://10.0.0.5:3000/shipping-informations/7/', origin), { kind: 'shipment', id: 7, path: '/shipping-informations/7', foreignHost: '10.0.0.5:3000' });
  for (const value of ['', '34', 'NWTS-X-1', 'NWTS-P-0', 'javascript:alert(1)', 'https://evil.example/login', 'https://nwts.example/profiles/34/edit', 'https://nwts.example/users', 'P-99999999999999']) assert.equal(parseScan(value, origin), null, value);
});

const { parseDeviceCode, readingSourceProblem } = require('../lib/measurement-reading.cjs');
test('device codes are read into measurement fields and every device value must be checked', () => {
  assert.deepEqual(parseDeviceCode('NWTS-M;DEV=TH-204;T=18.4;RAD=0,06;H=47;P=1014'), { device: 'TH-204', values: { Temperature: 18.4, RadiationLevel: 0.06, Humidity: 47, Pressure: 1014 } });
  assert.deepEqual(parseDeviceCode('{"device":"RM-7","radiation":0.08}'), { device: 'RM-7', values: { RadiationLevel: 0.08 } });
  for (const value of ['', 'hello', 'T=abc', '{broken']) assert.equal(parseDeviceCode(value), null, value);
  assert.equal(readingSourceProblem(null), null);
  assert.equal(readingSourceProblem({ readings: [{ field: 'Temperature', method: 'CODE' }], confirmed: ['Temperature'] }), null);
  // Each value may come from its own device and method.
  assert.equal(readingSourceProblem({ readings: [{ field: 'Temperature', method: 'BLUETOOTH', device: 'TH-1' }, { field: 'Humidity', method: 'CODE', device: 'HY-2' }], confirmed: ['Humidity', 'Temperature'] }), null);
  assert.match(readingSourceProblem({ readings: [{ field: 'Temperature', method: 'CODE' }, { field: 'Humidity', method: 'CODE' }], confirmed: ['Temperature'] }), /Confirm every value/);
  assert.ok(readingSourceProblem({ readings: [{ field: 'Weight', method: 'CODE' }], confirmed: ['Weight'] }));
  assert.ok(readingSourceProblem({ readings: [{ field: 'Temperature', method: 'CODE' }, { field: 'Temperature', method: 'CODE' }], confirmed: ['Temperature'] }));
});
