const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const { encode } = require('next-auth/jwt');
const { database: db } = require('../lib/server/database.cjs');
const { createScopedDatabase } = require('../lib/server/scoped-database.cjs');
const enabled = process.env.NWTS_ISOLATED_TEST === '1';
const base = 'http://127.0.0.1:3109';
let server, output = '', orgA, orgB, admin, member, cookie, recordA, recordB;
async function call(path, method='GET', body, session=cookie, origin=base) {
  return fetch(base + path, { method, headers: { ...(session ? { cookie: session } : {}), origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function deletionReview(id, reason = 'Remove a profile recorded in error') {
  const profile = await db.containerProfile.findUniqueOrThrow({where:{id},include:{shippingInformation:true}});
  return { id, reason, actionKey:require('node:crypto').randomUUID(), expected:{quantity:profile.quantity,locationOriginId:profile.locationOriginId,wasteProfileId:profile.wasteProfileId,containerStatus:profile.containerStatus,truckStatus:profile.shippingInformation.truckStatus} };
}
const definitionKeys = { 'location-origin':'locationOriginData', 'waste-profile':'wasteProfileData', 'container-type':'containerTypeData' };
async function definitionRow(resource, id, session=cookie) {
  return (await (await call('/api/container-profile/'+resource,'GET',undefined,session)).json())[definitionKeys[resource]].find(row=>row.id===id);
}
// A reviewed definition change: current version, reason and a new confirmation key.
async function definitionReview(resource, id, extra={}) {
  const row = await definitionRow(resource, id);
  return { id, expectedVersion: row?.version || '0'.repeat(64), reason:'Administrative definition review', actionKey:require('node:crypto').randomUUID(), ...extra };
}
async function shipmentDeletionReview(id) {
  const detail = await (await call('/api/shipping-informations/' + id)).json();
  return { id, expectedVersion:detail.deletionVersion, actionKey:require('node:crypto').randomUUID(), reason:'Remove shipment recorded in error' };
}
before(async () => {
  if (!enabled) return;
  orgA = await db.organization.create({ data: { name: 'A' } });
  orgB = await db.organization.create({ data: { name: 'B' } });
  const user = { email: 'admin@test.example', password: 'not-a-login-hash', companyId: 1, companyName: 'A', address: 'A', administrator: true, role:'ADMINISTRATOR', organizationId: orgA.id };
  admin = await db.userProfile.create({ data: user });
  member = await db.userProfile.create({ data: { ...user, email: 'member@test.example', administrator: false, role:'EMPLOYEE', workArea:'SHIPPING' } });
  cookie = 'next-auth.session-token=' + await encode({ secret: process.env.NEXTAUTH_SECRET, token: { id: String(admin.id), email: admin.email, administrator: true } });
  recordA = await db.locationOrigin.create({ data: { name: 'A source', address: 'A', origin: 'A', organizationId: orgA.id } });
  recordB = await db.locationOrigin.create({ data: { name: 'B source', address: 'B', origin: 'B', organizationId: orgB.id } });
  await db.locationOrigin.create({ data: { name: 'Unassigned', address: 'Legacy', origin: 'Legacy' } });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3109', '-H', '127.0.0.1'], { env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { output = (output + data).slice(-15000); });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/auth/csrf')).ok) return; } catch { /* The server may still be starting. */ }
    if (server.exitCode !== null) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Server startup timeout: ' + output);
});
after(async () => { if (server?.exitCode === null) { server.kill('SIGTERM'); await once(server,'exit'); } await db.$disconnect(); });
const integration = (name, fn) => test(name, { skip: !enabled, timeout: 120000 }, async () => { try { await fn(); } catch(error) { console.error(output); throw error; } });
integration('every business API method rejects anonymous requests', async () => {
  for (const file of fs.readdirSync('app/api', { recursive:true }).filter(file => file.endsWith('route.js') && !file.startsWith('auth/'))) {
    const source = fs.readFileSync('app/api/'+file,'utf8');
    const path = '/api/' + file.replace(/\/route.js$/, '').replace(/\[[^\]]+\]/g, '1');
    for (const [,method] of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE) =/g)) {
      const response = await call(path, method, method === 'GET' ? undefined : {}, null);
      assert.equal(response.status, 401, method+' '+path);
    }
  }
});
integration('lists exclude other organizations and unassigned legacy records', async () => {
  const response = await call('/api/container-profile/location-origin');
  assert.equal(response.status, 200);
  const data = JSON.stringify(await response.json());
  assert.match(data, /A source/); assert.doesNotMatch(data, /B source|Unassigned/);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
integration('cross-organization update and delete cannot change a record', async () => {
  const response = await call('/api/container-profile/location-origin','DELETE',await definitionReview('location-origin',recordB.id));
  assert.equal(response.status,404);
  assert.ok(await db.locationOrigin.findUnique({ where: { id: recordB.id } }));
  await assert.rejects(db.$transaction(tx => createScopedDatabase(tx,orgA.id).locationOrigin.update({ where:{ id:recordB.id },data:{name:'Tampered'} })), { code:'P2025' });
});
integration('cross-organization references and invalid quantities are rejected', async () => {
  const shipment = await db.shippingInformation.create({ data:{ companyName:'A',driverName:'Driver',registrationPlates:'TEST',organizationId:orgA.id } });
  const type = await db.containerType.create({ data:{name:'A',material:'steel',volume:1,carryingCapacity:1,radioactivityLevel:'demo',physicalProperties:'demo',footprint:1,description:'demo',organizationId:orgA.id} });
  const waste = await db.wasteProfile.create({ data:{name:'A',typeOfWaste:'demo',wasteDescription:'demo',risksAndHazards:'demo',processingMethods:'demo',physicalProperties:'demo',chemicalProperties:'demo',biologicalProperties:'demo',collectionProcedures:'demo',containerTypeId:type.id,organizationId:orgA.id} });
  const payload = {quantity:1,shippingInformationId:shipment.id,locationOriginId:recordB.id,wasteProfileId:waste.id, actionKey:require("node:crypto").randomUUID(), expected:{truckStatus:shipment.truckStatus,status:shipment.status,containerTypeId:type.id}};
  assert.equal((await call('/api/container-profile','POST',payload)).status,404);
  assert.equal((await call('/api/container-profile','POST',{...payload,locationOriginId:recordA.id,quantity:-2})).status,400);
  assert.equal(await db.containerProfile.count(),0);
  assert.equal((await call('/api/container-profile','POST',{...payload,locationOriginId:recordA.id})).status,200);
  assert.equal((await db.containerProfile.findFirst()).organizationId,orgA.id);
});
integration('writes require current admin rights and same-origin JSON', async () => {
  assert.equal((await call('/api/container-profile/location-origin','POST',{name:'X',address:'X',origin:'X'},cookie,'https://attacker.example')).status,403);
  const memberCookie = 'next-auth.session-token=' + await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id),administrator:true}});
  assert.equal((await call('/api/container-profile/location-origin','DELETE',{id:recordA.id},memberCookie)).status,403);
  await db.userProfile.update({where:{id:admin.id},data:{active:false}});
  assert.equal((await call('/api/container-profile/location-origin')).status,401);
  await db.userProfile.update({where:{id:admin.id},data:{active:true}});
});
integration('public registration is disabled', async () => {
  assert.equal((await call('/api/auth/register', 'POST', { username:'intruder', password:'long-test-password', role:'ADMINISTRATOR' }, null)).status, 403);
  assert.equal(await db.userProfile.count({ where:{ username:'intruder' } }), 0);
});
integration('transaction failure rolls back earlier business writes', async () => {
  await assert.rejects(db.$transaction(async tx => { await createScopedDatabase(tx,orgA.id).locationOrigin.create({data:{name:'Rolled back',address:'A',origin:'A'}});throw new Error('Simulated failure'); }));
  assert.equal(await db.locationOrigin.count({where:{name:'Rolled back'}}),0);
});
integration('all collection GET routes work for an authenticated organization', async () => {
  for (const file of fs.readdirSync('app/api', { recursive: true }).filter(file => file.endsWith('route.js') && !file.startsWith('auth/') && !file.includes('['))) {
    if (!/export const GET =/.test(fs.readFileSync('app/api/' + file, 'utf8'))) continue;
    const path = '/api/' + file.replace(/\/route.js$/, '');
    const response = await call(path);
    assert.equal(response.status, 200, path + ': ' + await response.text());
  }
});
integration('ID lookups and malformed update envelopes fail without leaking other firms', async () => {
  const foreign = await db.shippingInformation.create({ data: { organizationId: orgB.id, companyName: 'B', driverName: 'B driver', registrationPlates: 'B-TEST' } });
  assert.equal((await call('/api/shipping-informations/' + foreign.id)).status, 404);
  assert.equal((await call('/api/shipping-informations/1bad')).status, 400);
  assert.equal((await call('/api/container-profile', 'PUT', {})).status, 400);
  assert.equal((await call('/api/container-profile/location-origin', 'POST', { name: 'X', address: 'X', origin: 'X', organizationId: orgB.id })).status, 400);
  const stats = await call('/api/stats');
  assert.equal((await stats.json()).activeShipments, 1);
});
integration('revoking admin rights is effective immediately for an existing session', async () => {
  await db.userProfile.update({ where: { id: admin.id }, data: { administrator: false, role:'EMPLOYEE', workArea:'SHIPPING' } });
  try { assert.equal((await call('/api/container-profile/location-origin', 'DELETE', { id: recordA.id })).status, 403); }
  finally { await db.userProfile.update({ where: { id: admin.id }, data: { administrator: true, role:'ADMINISTRATOR' } }); }
});
integration('authentication rate limits are shared atomically across concurrent attempts', async () => {
  const { rateLimit } = require('../lib/server/rate-limit.cjs');
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => rateLimit('integration', 'same-account', 3)));
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 3);
  for (const result of results.filter(item => item.status === 'rejected')) assert.equal(result.reason.status, 429);
});
integration('departed shipments expose current permissions and allow only administrator corrections', async () => {
  const shipment = await db.shippingInformation.create({ data: {
    companyName: 'Departed shipment', driverName: 'Driver', registrationPlates: 'OUT-TEST',
    truckStatus: 'OUT', exitDateTime: new Date(), organizationId: orgA.id,
  } });
  const type = await db.containerType.create({ data: { name:'OUT type', material:'steel', volume:1, carryingCapacity:1, radioactivityLevel:'demo', physicalProperties:'demo', footprint:1, description:'demo', organizationId:orgA.id } });
  const waste = await db.wasteProfile.create({ data: { name:'OUT waste', typeOfWaste:'demo', wasteDescription:'demo', risksAndHazards:'demo', processingMethods:'demo', physicalProperties:'demo', chemicalProperties:'demo', biologicalProperties:'demo', collectionProcedures:'demo', containerTypeId:type.id, organizationId:orgA.id } });
  const containerData = { quantity:1, shippingInformationId:shipment.id, locationOriginId:recordA.id, wasteProfileId:waste.id };
  const container = await db.containerProfile.create({ data: { ...containerData, organizationId:orgA.id } });
  // Deliberately forge the old JWT privilege: the database remains authoritative.
  const memberCookie = 'next-auth.session-token=' + await encode({ secret:process.env.NEXTAUTH_SECRET, token:{ id:String(member.id), administrator:true } });
  const detailPath = '/api/shipping-informations/' + shipment.id;
  assert.equal((await (await call(detailPath, 'GET', undefined, memberCookie)).json()).permissions.canEdit, false);
  assert.equal((await (await call(detailPath)).json()).permissions.canEdit, true);
  const edits = [
    ['/api/shipping-informations', 'PUT', { updatedTruckData:{ id:shipment.id, companyName:'Corrected', driverName:'Driver', registrationPlates:'OUT-TEST', reason:'Correct company transcription', actionKey:require('node:crypto').randomUUID(), expected:{companyName:shipment.companyName,driverName:shipment.driverName,registrationPlates:shipment.registrationPlates,truckStatus:'OUT'} } }],
    ['/api/shipping-informations', 'PATCH', { shippingStatusData:{ id:shipment.id, truckStatus:'IN', exitDateTime:null } }],
    ['/api/shipping-informations', 'DELETE', await shipmentDeletionReview(shipment.id)],
    ['/api/container-profile', 'POST', {...containerData, actionKey:require('node:crypto').randomUUID(), reason:'Add omitted profile to departed shipment', expected:{truckStatus:'OUT',status:shipment.status,containerTypeId:type.id}}],
    ['/api/container-profile', 'PUT', { preparedData:{ id:container.id, quantity:2, locationOrigin:recordA.id, wasteProfile:waste.id, actionKey:require('node:crypto').randomUUID(), reason:'Correct profile quantity', expected:{quantity:container.quantity,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'pending',truckStatus:'OUT'} } }],
    ['/api/container-profile', 'PATCH', { containerStatusUpdateData:{ containerProfileId:container.id, containerStatus:'accepted' } }],
    ['/api/container-profile', 'DELETE', { id:container.id, actionKey:require('node:crypto').randomUUID(), reason:'Remove mistakenly entered profile', expected:{quantity:2,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'pending',truckStatus:'OUT'} }],
  ];
  for (const [path, method, body] of edits) {
    assert.equal((await call(path, method, body, memberCookie)).status, 403, method + ' ' + path);
  }
  assert.equal((await db.shippingInformation.findUnique({ where:{ id:shipment.id } })).truckStatus, 'OUT');
  assert.equal((await db.containerProfile.findUnique({ where:{ id:container.id } })).quantity, 1);
  for (const index of [0, 3, 4, 6, 2]) {
    const [path, method, body] = edits[index];
    assert.equal((await call(path, method, index === 2 ? await shipmentDeletionReview(shipment.id) : body)).status, 200, 'Administrator: ' + method + ' ' + path);
  }
  // Permission revocation must also be reflected by the read endpoint immediately.
  await db.userProfile.update({ where:{ id:admin.id }, data:{ administrator:false, role:'EMPLOYEE', workArea:'SHIPPING' } });
  try {
    const other = await db.shippingInformation.create({ data:{ organizationId:orgA.id, companyName:'OUT', driverName:'D', registrationPlates:'T', truckStatus:'OUT' } });
    assert.equal((await (await call('/api/shipping-informations/' + other.id)).json()).permissions.canEdit, false);
  } finally {
    await db.userProfile.update({ where:{ id:admin.id }, data:{ administrator:true, role:'ADMINISTRATOR' } });
  }
});
integration('three roles enforce account hierarchy, operational access and password changes', async () => {
  const bcrypt = require('bcryptjs');
  const profile = { actionKey:require('node:crypto').randomUUID(), displayName:'Test Supervisor', username:'test.supervisor', email:'supervisor@test.example', password:'Initial-test-password-42', role:'SUPERVISION' };
  let response = await call('/api/users', 'POST', profile);
  assert.equal(response.status, 201);
  const supervisor = (await response.json()).user;
  assert.equal(supervisor.password, undefined);
  const supervisorCookie = 'next-auth.session-token=' + await encode({ secret:process.env.NEXTAUTH_SECRET, token:{ id:String(supervisor.id), administrator:true } });
  const employeeProfile = { ...profile, actionKey:require('node:crypto').randomUUID(), displayName:'Test Employee', username:'test.employee', email:'employee@test.example', role:'EMPLOYEE', workArea:'SHIPPING' };
  assert.equal((await call('/api/users', 'POST', { ...employeeProfile, role:'ADMINISTRATOR' }, supervisorCookie)).status, 403);
  assert.equal((await call('/api/users', 'POST', { ...employeeProfile, role:'SUPERVISION' }, supervisorCookie)).status, 403);
  response = await call('/api/users', 'POST', employeeProfile, supervisorCookie);
  assert.equal(response.status, 201);
  const employee = (await response.json()).user;
  const employeeCookie = 'next-auth.session-token=' + await encode({ secret:process.env.NEXTAUTH_SECRET, token:{ id:String(employee.id) } });
  assert.equal((await call('/api/users', 'GET', undefined, employeeCookie)).status, 403);
  assert.equal((await call('/api/stats', 'GET', undefined, employeeCookie)).status, 200);
  assert.equal((await call('/api/stats', 'GET', undefined, supervisorCookie)).status, 200);
  assert.equal((await call('/api/users', 'POST', profile, employeeCookie)).status, 403);
  assert.ok((await (await call('/api/users', 'GET', undefined, supervisorCookie)).json()).users.every(user => user.role === 'EMPLOYEE'));
  assert.equal((await call('/api/users', 'PUT', { ...employeeProfile, id:employee.id, enabled:true }, supervisorCookie)).status, 403);
  const foreign = await db.userProfile.create({ data:{ email:'foreign@test.example', password:'x', companyId:2, companyName:'B', address:'B', administrator:false, organizationId:orgB.id } });
  assert.equal((await call('/api/users', 'PUT', { ...employeeProfile, id:foreign.id, enabled:true })).status, 404);
  assert.equal((await call('/api/users', 'PUT', { ...employeeProfile, id:admin.id, role:'EMPLOYEE', workArea:'SHIPPING', enabled:true })).status, 403);
  assert.equal((await call('/api/users', 'POST', { ...employeeProfile, username:'other', email:'other@test.example', organizationId:orgB.id })).status, 400);
  assert.equal((await call('/api/users', 'POST', { ...employeeProfile, password:'short' })).status, 400);
  const shipping = { companyName:'Employee entry', driverName:'Driver', registrationPlates:'EMP-IN' };
  assert.equal((await call('/api/shipping-informations', 'POST', {...shipping,actionKey:require('node:crypto').randomUUID()}, employeeCookie)).status, 200);
  const shipment = await db.shippingInformation.findFirstOrThrow({ where:{ registrationPlates:'EMP-IN' } });
  assert.equal((await call('/api/shipping-informations', 'PUT', { updatedTruckData:{ ...shipping, id:shipment.id, driverName:'Corrected' } }, employeeCookie)).status, 200);
  assert.equal((await call('/api/shipping-informations/departure', 'POST', {id:shipment.id,actionKey:require('node:crypto').randomUUID(),expected:{companyName:shipment.companyName,driverName:'Corrected',registrationPlates:shipment.registrationPlates,truckStatus:'IN'}}, employeeCookie)).status, 200);
  for (const session of [employeeCookie, supervisorCookie]) {
    assert.equal((await call('/api/shipping-informations', 'DELETE', await shipmentDeletionReview(shipment.id), session)).status, 403);
    assert.equal((await (await call('/api/shipping-informations/' + shipment.id, 'GET', undefined, session)).json()).permissions.canEdit, false);
  }
  assert.equal((await call('/api/account', 'PUT', { currentPassword:'wrong', newPassword:'New-test-password-123' }, employeeCookie)).status, 400);
  assert.equal((await call('/api/account', 'PUT', { currentPassword:profile.password, newPassword:'New-test-password-123' }, employeeCookie)).status, 200);
  const changed = await db.userProfile.findUniqueOrThrow({ where:{ id:employee.id } });
  assert.ok(await bcrypt.compare('New-test-password-123', changed.password));
  assert.ok(!await bcrypt.compare(profile.password, changed.password));
  assert.equal((await call('/api/account', 'GET', undefined, employeeCookie)).status, 401);
  // Exercise the real credentials callback using a username and the changed password.
  async function login(username, password) {
    const csrf = await fetch(base + '/api/auth/csrf');
    const cookies = csrf.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const { csrfToken } = await csrf.json();
    const result = await fetch(base + '/api/auth/callback/credentials', { method:'POST', redirect:'manual', headers:{ cookie:cookies, 'Content-Type':'application/x-www-form-urlencoded' }, body:new URLSearchParams({ csrfToken, email:username, password, json:'true' }) });
    return result.headers.getSetCookie().find(value => value.startsWith('next-auth.session-token='));
  }
  assert.ok(await login('test.employee', 'New-test-password-123'));
  assert.equal(await login('test.employee', profile.password), undefined);
  assert.equal((await call('/api/users', 'PUT', { ...employeeProfile, id:employee.id, enabled:false, expected:await db.userProfile.findUniqueOrThrow({where:{id:employee.id}}).then(row=>Object.fromEntries(['username','email','displayName','role','workArea','active'].map(key=>[key === 'active' ? 'enabled' : key,row[key]]))), reason:'Disable test account', actionKey:require('node:crypto').randomUUID() })).status, 200);
  assert.equal(await login('test.employee', 'New-test-password-123'), undefined);
});
integration('concept fixtures are reusable and container profile creation requires management', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const first = await seedConcept(db, orgA.id);
  const second = await seedConcept(db, orgA.id);
  assert.deepEqual(second, first);
  assert.equal(await db.containerProfile.count({ where:{ shippingInformationId:first.shipmentId } }), 2);
  const profiles = await db.containerProfile.findMany({ where:{ shippingInformationId:first.shipmentId }, orderBy:{ quantity:'desc' }, include:{ wasteProfile:{ include:{ containerType:true } }, locationOrigin:true } });
  assert.deepEqual(profiles.map(profile => profile.quantity), [15,12]);
  assert.equal(profiles[0].wasteProfile.containerType.volume, 15);
  assert.match(profiles[0].locationOrigin.name, /Brokdorf/);
  assert.match(profiles[1].locationOrigin.name, /Ahaus/);
  const memberCookie = 'next-auth.session-token=' + await encode({secret:process.env.NEXTAUTH_SECRET, token:{id:String(member.id)}});
  assert.equal((await call('/api/container-profile','POST',{ quantity:1, shippingInformationId:first.shipmentId, locationOriginId:first.locationOriginIds[0], wasteProfileId:first.wasteProfileIds[0] },memberCookie)).status,403);
  const conceptShipment = await db.shippingInformation.findUniqueOrThrow({where:{id:first.shipmentId}});
  const conceptWaste = await db.wasteProfile.findUniqueOrThrow({where:{id:first.wasteProfileIds[0]}});
  assert.equal((await call('/api/container-profile','POST',{ quantity:1, shippingInformationId:first.shipmentId, locationOriginId:first.locationOriginIds[0], wasteProfileId:first.wasteProfileIds[0], actionKey:require('node:crypto').randomUUID(), expected:{truckStatus:conceptShipment.truckStatus,status:conceptShipment.status,containerTypeId:conceptWaste.containerTypeId} })).status,200);
  await db.shippingInformation.update({ where:{ id:first.shipmentId }, data:{ truckStatus:'OUT' } });
  await seedConcept(db,orgA.id);
  assert.equal((await db.shippingInformation.findUnique({ where:{ id:first.shipmentId } })).truckStatus,'OUT');
  assert.equal(await db.containerProfile.count({ where:{ shippingInformationId:first.shipmentId } }),3);
});
integration('component definitions can be managed only by administrators', async () => {
  const memberCookie = 'next-auth.session-token=' + await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id),role:'ADMINISTRATOR'}});
  for (const resource of ['location-origin','waste-profile','container-type']) {
    const path = '/api/container-profile/' + resource;
    assert.equal((await call(path,'GET',undefined,memberCookie)).status,200);
    for (const method of ['POST','PUT','PATCH','DELETE']) {
      assert.equal((await call(path,method,{},memberCookie)).status,403,method+' '+path);
    }
  }
  assert.equal((await call('/api/container-profile/definition-changes','GET',undefined,memberCookie)).status,403);
  assert.equal((await call('/api/container-profile/location-origin','POST',{values:{name:'Admin managed source',address:'Demo',origin:'Demo'},actionKey:require('node:crypto').randomUUID()})).status,200);
});
integration('waste profiles keep their own container type and reject occupied types without changing data', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const fixture = await seedConcept(db, orgA.id);
  const other = await db.wasteProfile.findUniqueOrThrow({ where:{ id:fixture.wasteProfileIds[1] } });
  const typeData = {organizationId:orgA.id,material:'Demo',volume:1,carryingCapacity:1,footprint:1,radioactivityLevel:'Demo',physicalProperties:'Demo',description:'Demo'};
  const own = await db.containerType.create({data:{...typeData,name:'Own type'}});
  const values = {name:'Unused waste',typeOfWaste:'demo',wasteDescription:'demo',risksAndHazards:'demo',processingMethods:'demo',physicalProperties:'demo',chemicalProperties:'demo',biologicalProperties:'demo',collectionProcedures:'demo',containerTypeId:own.id};
  const created = await call('/api/container-profile/waste-profile','POST',{values,actionKey:require('node:crypto').randomUUID()});
  assert.equal(created.status,200);
  const id = (await created.json()).change.definitionId;
  const current = await db.wasteProfile.findUniqueOrThrow({where:{id}});
  const response = await call('/api/container-profile/waste-profile','PUT',{...await definitionReview('waste-profile',id),values:{...values,name:'Must not persist',containerTypeId:other.containerTypeId}});
  assert.equal(response.status,409);
  assert.match((await response.json()).message,/already assigned/);
  assert.deepEqual(await db.wasteProfile.findUniqueOrThrow({where:{id}}),current);
  const create = await call('/api/container-profile/waste-profile','POST',{values:{...values,name:'Duplicate type'},actionKey:require('node:crypto').randomUUID()});
  assert.equal(create.status,409);
  assert.match((await create.json()).message,/already assigned/);
  const spare = await db.containerType.create({data:{...typeData,name:'Spare'}});
  assert.equal((await call('/api/container-profile/waste-profile','PUT',{...await definitionReview('waste-profile',id),values:{...values,containerTypeId:spare.id}})).status,200);
  assert.equal((await db.wasteProfile.findUniqueOrThrow({where:{id}})).containerTypeId,spare.id);
});
integration('demo startup preserves renamed waste profiles instead of duplicating occupied types', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const org = await db.organization.create({ data:{ name:'Seed rename regression' } });
  const initial = await seedConcept(db, org.id);
  const renamed = await db.wasteProfile.update({ where:{ id:initial.wasteProfileIds[1] }, data:{ name:'User renamed M02', wasteDescription:'User changes must survive startup' } });
  const count = await db.wasteProfile.count({ where:{ organizationId:org.id } });
  for (let run=0; run<2; run++) {
    assert.deepEqual(await seedConcept(db,org.id),initial);
    assert.equal(await db.wasteProfile.count({ where:{ organizationId:org.id } }),count);
    assert.deepEqual(await db.wasteProfile.findUnique({ where:{ id:renamed.id } }),renamed);
  }
});

integration('assigned employees see only their workspace and cannot cross API or page boundaries', async () => {
  const sessions = {};
  for (const workArea of ['SHIPPING','PRE_STORAGE','FINAL_STORAGE']) {
    const user = await db.userProfile.create({data:{email:`${workArea}@areas.example`,password:'unused',companyId:1,companyName:'A',address:'A',organizationId:orgA.id,role:'EMPLOYEE',administrator:false,workArea}});
    const token = 'next-auth.session-token=' + await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id),role:'ADMINISTRATOR',workArea:'SHIPPING'}});
    sessions[workArea] = {user,token};
    const response = await call('/api/workspace','GET',undefined,token);
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).workspaces.map(w=>w.key),[workArea]);
    for(const [area,path] of Object.entries({SHIPPING:'/api/shipping-informations',PRE_STORAGE:'/api/pre-storage-setup',FINAL_STORAGE:'/api/final-storage-setup'})) {
      assert.equal((await call(path,'GET',undefined,token)).status,area===workArea?200:403,path+' '+workArea);
    }
    assert.equal((await call('/api/container-profile','POST',{},token)).status,403);
    const page = await fetch(base + (workArea==='SHIPPING'?'/pre-storage':'/shipping-informations'),{headers:{cookie:token},redirect:'manual'});
    if (page.status === 307) assert.equal(page.headers.get('location'),'/');
    else {
      assert.equal(page.status,200);
      const html = await page.text();
      assert.match(html, /NEXT_REDIRECT;replace;\/;307;/);
    }
  }
  const pre=sessions.PRE_STORAGE.token, final=sessions.FINAL_STORAGE.token;
  assert.equal((await call('/api/pre-storage-setup/transfers','GET',undefined,pre)).status,200);
  assert.equal((await call('/api/shipping-informations/pending','GET',undefined,pre)).status,200);
  assert.equal((await call('/api/shipping-informations/pending','GET',undefined,final)).status,403);
  const transfer='/api/final-storage-setup/final-storage-transver-request';
  assert.equal((await call(transfer,'POST',{},pre)).status,403);
  assert.equal((await call(transfer,'POST',{},final)).status,400);
  assert.equal((await call(transfer,'PUT',{operationType:'PRE_STORAGE_ACCEPT_REQUEST',data:{id:1}},final)).status,403);
  assert.equal((await call(transfer,'PUT',{operationType:'FINAL_STORAGE_ACCEPT_RESPONSE',data:{id:1}},pre)).status,403);
  assert.equal((await call('/api/pre-storage-setup','POST',{},pre)).status,400);
  assert.equal((await call('/api/pre-storage-setup/pre-storage-location','POST',{},pre)).status,403);
  await db.userProfile.update({where:{id:sessions.SHIPPING.user.id},data:{workArea:'FINAL_STORAGE'}});
  assert.equal((await call('/api/shipping-informations','GET',undefined,sessions.SHIPPING.token)).status,403);
  assert.equal((await call('/api/final-storage-setup','GET',undefined,sessions.SHIPPING.token)).status,200);
  await db.userProfile.update({where:{id:sessions.SHIPPING.user.id},data:{workArea:null}});
  assert.equal((await call('/api/workspace','GET',undefined,sessions.SHIPPING.token)).status,403);
  assert.equal((await call('/api/account','GET',undefined,sessions.SHIPPING.token)).status,200);
});

integration('pre-storage receipt is atomic and rejects duplicate or mismatched quantities', async () => {
  const {seedConcept} = require('../prisma/seed-concept.cjs');
  const fixture = await seedConcept(db, orgA.id);
  await db.shippingInformation.update({where:{id:fixture.shipmentId},data:{truckStatus:'IN'}});
  const profile = await db.containerProfile.create({data:{organizationId:orgA.id,quantity:2,shippingInformationId:fixture.shipmentId,locationOriginId:fixture.locationOriginIds[0],wasteProfileId:fixture.wasteProfileIds[0]}});
  const hall = await db.preStorageLocation.create({data:{organizationId:orgA.id,name:'Receipt test',surfaceArea:100,containerFootprint:2,containerType:'M01',wasteProfile:'M01',preStorageFor:'Test'}});
  const employee = await db.preStorageResponsibleEmployee.create({data:{organizationId:orgA.id,name:'Test',surname:'Receiver',dateOfBirth:new Date('1990-01-01'),address:'Test',qualifications:'Test'}});
  const user = await db.userProfile.findFirstOrThrow({where:{email:'PRE_STORAGE@areas.example'}});
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const body={quantity:2,containerProfileIds:[profile.id],preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:employee.id,receiptKey:require("node:crypto").randomUUID()};
  assert.equal((await call('/api/pre-storage-setup','POST',{...body,quantity:3},session)).status,400);
  assert.equal((await call('/api/pre-storage-setup','POST',body,session)).status,200);
  const replay=await call('/api/pre-storage-setup','POST',body,session);
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).replayed,true);
  assert.equal((await call('/api/pre-storage-setup','POST',{...body,quantity:3},session)).status,409);
  assert.equal((await call('/api/pre-storage-setup','POST',{...body,receiptKey:require('node:crypto').randomUUID()},session)).status,409);
  assert.equal(await db.preStorageEntry.count({where:{preStorageLocationId:hall.id}}),1);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).containerStatus,'accepted');
  const allocation=await db.receiptAllocation.findFirstOrThrow({where:{containerProfileId:profile.id}});
  assert.equal(allocation.actorId,user.id); assert.equal(allocation.quantity,2); assert.equal(allocation.shipmentId,fixture.shipmentId);
  assert.equal(await db.receiptAllocation.count({where:{containerProfileId:profile.id}}),1);
  const timeline=(await (await call('/api/shipping-informations/'+fixture.shipmentId)).json()).timeline;
  const receiptEvent=timeline.events.find(row=>row.key==='receipt-'+allocation.id);
  assert.ok(receiptEvent); assert.equal(receiptEvent.date,allocation.createdAt.toISOString());
  assert.match(receiptEvent.detail,/2 containers/);

});

integration('pre-storage returns a delivery to Step 1 only with an inspection report', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const org = await db.organization.create({ data:{ name:'Return organization' } });
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const base={password:'not-a-login-hash',companyId:1,companyName:'A',address:'A',administrator:false,organizationId:org.id};
  const pre=await db.userProfile.create({data:{...base,email:'return-pre@test.example',role:'EMPLOYEE',workArea:'PRE_STORAGE'}});
  const shipping=await db.userProfile.create({data:{...base,email:'return-shipping@test.example',role:'EMPLOYEE',workArea:'SHIPPING'}});
  const preSession=await session(pre), shippingSession=await session(shipping);
  const fixture=await seedConcept(db, org.id);
  const profiles=await db.containerProfile.findMany({where:{shippingInformationId:fixture.shipmentId},include:{wasteProfile:true},orderBy:{id:'asc'}});
  const [steel, concrete]=profiles;
  const hall=await db.preStorageLocation.create({data:{organizationId:org.id,name:'Return hall',surfaceArea:1000,containerFootprint:2,containerType:'Steel',wasteProfile:steel.wasteProfile.name,preStorageFor:'Test'}});
  const person=await db.preStorageResponsibleEmployee.create({data:{organizationId:org.id,name:'Alex',surname:'Inspector',dateOfBirth:new Date('1984-11-12'),address:'Test',qualifications:'Test'}});
  const body=extra=>({actionKey:require('node:crypto').randomUUID(),shipmentId:fixture.shipmentId,locationId:hall.id,responsibleEmployeeId:person.id,reasons:['QUANTITY_MISMATCH','DAMAGED_CONTAINER'],note:'Two containers missing, one dented lid',profiles:[{id:steel.id,quantity:steel.quantity,countedQuantity:13}],...extra});
  const path='/api/pre-storage-setup/rejections';
  // Rejecting without a report is no longer possible outside an administrator correction.
  assert.equal((await call('/api/container-profile','PATCH',{containerStatusUpdateData:{containerProfileId:steel.id,containerStatus:'rejected'}},preSession)).status,403);
  assert.equal((await call(path,'POST',body(),shippingSession)).status,403);
  assert.equal((await call(path,'POST',body({reasons:[]}),preSession)).status,400);
  assert.equal((await call(path,'POST',body({profiles:[{id:steel.id,quantity:steel.quantity}]}),preSession)).status,400);
  assert.equal((await call(path,'POST',body({profiles:[{id:steel.id,quantity:steel.quantity,countedQuantity:steel.quantity}]}),preSession)).status,400);
  assert.equal((await call(path,'POST',body({reasons:['OTHER'],note:'',profiles:[{id:steel.id,quantity:steel.quantity}]}),preSession)).status,400);
  assert.equal((await call(path,'POST',body({profiles:[{id:concrete.id,quantity:concrete.quantity,countedQuantity:1}]}),preSession)).status,409);
  assert.equal((await call(path,'POST',body({profiles:[{id:steel.id,quantity:steel.quantity+1,countedQuantity:13}]}),preSession)).status,409);
  const request=body();
  const response=await call(path,'POST',request,preSession);
  assert.equal(response.status,200);
  const { rejection }=await response.json();
  assert.equal((await (await call(path,'POST',request,preSession)).json()).replayed,true);
  assert.equal((await call(path,'POST',{...request,note:'Different'},preSession)).status,409);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:steel.id}})).containerStatus,'rejected');
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:concrete.id}})).containerStatus,'pending');
  assert.equal((await call(path,'POST',body(),preSession)).status,409);
  // Step 1 sees the report on the profile, and the timeline records it.
  const detail=await (await call('/api/shipping-informations/'+fixture.shipmentId,'GET',undefined,shippingSession)).json();
  const returned=detail.shippingData.containerProfiles.find(row=>row.id===steel.id);
  assert.equal(returned.lastReturn.id,rejection.id);
  assert.equal(returned.lastReturn.hall,'Return hall');
  assert.equal(returned.lastReturn.responsibleEmployee,'Alex Inspector');
  assert.deepEqual(returned.lastReturn.reasons,['QUANTITY_MISMATCH','DAMAGED_CONTAINER']);
  assert.deepEqual(returned.lastReturn.profiles,[{containerProfileId:steel.id,expectedQuantity:steel.quantity,countedQuantity:13}]);
  assert.equal(returned.lastReturn.note,'Two containers missing, one dented lid');
  assert.equal(returned.lastReturn.fingerprint,undefined);
  assert.equal(detail.shippingData.containerProfiles.find(row=>row.id===concrete.id).lastReturn,null);
  assert.ok(detail.timeline.events.some(row=>row.key==='return-'+rejection.id&&/counted 13 of 15/.test(row.detail)));
  assert.equal(detail.journey.steps.find(step=>step.key==='receipt').state,'blocked');
  // The Pre-storage queue no longer offers the returned profile.
  const pending=await (await call('/api/shipping-informations/pending','GET',undefined,preSession)).json();
  assert.deepEqual(pending.pendingShippingInformations.flatMap(row=>row.containerProfiles.map(item=>item.id)),[concrete.id]);

  // Step 1 hands the return to Supervision; the truck waits and only management resends it.
  const supervisor=await db.userProfile.create({data:{...base,email:'return-supervisor@test.example',role:'SUPERVISION'}});
  const supervisorSession=await session(supervisor);
  const act=(extra,who)=>call('/api/shipping-informations/returns','POST',{actionKey:require('node:crypto').randomUUID(),rejectionId:rejection.id,action:'ESCALATE',note:'Driver disputes the count; documents say 15',expectedState:'open',...extra},who);
  assert.equal((await act({},preSession)).status,403);
  assert.equal((await act({note:'x'},shippingSession)).status,400);
  assert.equal((await act({expectedState:'escalated'},shippingSession)).status,409);
  assert.equal((await act({profiles:[{id:steel.id,quantity:13}]},shippingSession)).status,400);
  assert.equal((await act({},shippingSession)).status,200);
  assert.equal((await act({},shippingSession)).status,409);
  // Names of the organization's people, never of another organization.
  const people=(await (await call('/api/people','GET',undefined,shippingSession)).json()).people;
  assert.equal(people[pre.id],'return-pre@test.example');
  assert.equal(people[admin.id],undefined);
  const held=await (await call('/api/shipping-informations/'+fixture.shipmentId,'GET',undefined,shippingSession)).json();
  assert.equal(held.returnState,'escalated');
  assert.equal(held.returns[0].state,'escalated');
  assert.equal(held.permissions.canDecideReturns,false);
  const list=await (await call('/api/shipping-informations','GET',undefined,shippingSession)).json();
  assert.equal(list.shippingData.find(row=>row.id===fixture.shipmentId).returnState,'escalated');
  const shippingHome=(await (await call('/api/workspace','GET',undefined,shippingSession)).json()).workspaces[0];
  assert.deepEqual(shippingHome.tasks.map(row=>row.kind),['onHold']);
  const attention=(await (await call('/api/overview','GET',undefined,supervisorSession)).json()).attention;
  assert.equal(attention[0].type,'return');
  assert.equal(attention[0].note,'Driver disputes the count; documents say 15');
  // An administrator has every right of Supervision, including this decision.
  const administrator=await db.userProfile.create({data:{...base,email:'return-admin@test.example',role:'ADMINISTRATOR',administrator:true}});
  const adminSession=await session(administrator);
  assert.equal((await (await call('/api/overview','GET',undefined,adminSession)).json()).attention[0].type,'return');
  assert.equal((await (await call('/api/shipping-informations/'+fixture.shipmentId,'GET',undefined,adminSession)).json()).permissions.canDecideReturns,true);
  const same={id:steel.id,quantity:13,locationOriginId:steel.locationOriginId,wasteProfileId:steel.wasteProfileId};
  const resend=(extra,who)=>act({action:'RESEND',expectedState:'escalated',note:'Recounted with the driver: 13 containers, documents corrected',profiles:[same],...extra},who);
  assert.equal((await resend({},shippingSession)).status,403);
  assert.equal((await resend({profiles:[]},adminSession)).status,409);
  assert.equal((await resend({profiles:[{id:steel.id,quantity:13}]},adminSession)).status,400);
  assert.equal((await resend({},adminSession)).status,200);
  const resent=await db.containerProfile.findUniqueOrThrow({where:{id:steel.id}});
  assert.equal(resent.quantity,13); assert.equal(resent.containerStatus,'pending');
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:steel.id}}),1);
  const after=await (await call('/api/shipping-informations/'+fixture.shipmentId,'GET',undefined,shippingSession)).json();
  assert.equal(after.returnState,null);
  assert.equal(after.returns[0].state,'resolved');
  assert.deepEqual(after.returns[0].actions.map(row=>[row.action,row.actorRole]),[['ESCALATED','EMPLOYEE'],['RESENT','ADMINISTRATOR']]);
  const origin=await db.locationOrigin.findUniqueOrThrow({where:{id:steel.locationOriginId}});
  assert.deepEqual(after.returns[0].actions[1].changes,[{containerProfileId:steel.id,
    before:{quantity:15,locationOriginId:origin.id,locationOrigin:origin.name,wasteProfileId:steel.wasteProfileId,wasteProfile:steel.wasteProfile.name},
    after:{quantity:13,locationOriginId:origin.id,locationOrigin:origin.name,wasteProfileId:steel.wasteProfileId,wasteProfile:steel.wasteProfile.name}}]);
  assert.ok(after.timeline.events.some(row=>row.title==='Return sent to Supervision'));
  // Pre-storage sees the earlier report and the correction when the profile arrives again.
  const again=await (await call('/api/shipping-informations/pending','GET',undefined,preSession)).json();
  const offered=again.pendingShippingInformations.flatMap(row=>row.containerProfiles).find(row=>row.id===steel.id);
  assert.equal(offered.quantity,13);
  assert.equal(offered.returnHistory.length,1);
  assert.equal(offered.returnHistory[0].actions[1].note,'Recounted with the driver: 13 containers, documents corrected');
  // A new return that Step 1 resolves itself stays with Step 1.
  const second=await call(path,'POST',body({reasons:['LABELLING'],note:'',profiles:[{id:steel.id,quantity:13}]}),preSession);
  assert.equal(second.status,200);
  const secondId=(await second.json()).rejection.id;
  // Step 1 may also correct the location origin and waste profile; the new waste profile routes it to that hall.
  const archived=await db.locationOrigin.create({data:{organizationId:org.id,name:'Closed site',address:'A',origin:'A',archivedAt:new Date()}});
  const moved={...same,locationOriginId:concrete.locationOriginId,wasteProfileId:concrete.wasteProfileId};
  assert.equal((await act({rejectionId:secondId,action:'RESEND',note:'Wrong origin chosen',profiles:[{...moved,locationOriginId:archived.id}]},shippingSession)).status,409);
  assert.equal((await act({rejectionId:secondId,action:'RESEND',note:'Labels show M02 from Ahaus; profile corrected',profiles:[moved]},shippingSession)).status,200);
  const rerouted=await db.containerProfile.findUniqueOrThrow({where:{id:steel.id}});
  assert.equal(rerouted.containerStatus,'pending');
  assert.equal(rerouted.wasteProfileId,concrete.wasteProfileId);
  assert.equal(rerouted.locationOriginId,concrete.locationOriginId);
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:steel.id}}),2);
  const last=(await (await call('/api/shipping-informations/'+fixture.shipmentId,'GET',undefined,shippingSession)).json()).returns[0].actions[0];
  assert.equal(last.actorRole,'EMPLOYEE');
  assert.equal(last.changes[0].after.wasteProfile,concrete.wasteProfile.name);
});

integration('storage history paginates and latest-condition overview stays scoped to the work area', async () => {
  const user = await db.userProfile.findFirstOrThrow({where:{email:'PRE_STORAGE@areas.example'}});
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const hall = await db.preStorageLocation.findFirstOrThrow({where:{organizationId:orgA.id,name:'Receipt test'}});
  const employee=await db.preStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  for(let i=0;i<12;i++) await db.preStorageConditions.create({data:{organizationId:orgA.id,preStorageLocationId:hall.id,preStorageResponsibleEmployeeId:employee.id,preStorageTemperature:i===11?20:45,preStorageRadiationLevel:0.05,preStorageHumidity:50,preStoragePressure:1015,createdAt:new Date(Date.UTC(2026,8,13,10,i))}});
  const url='/api/pre-storage-setup/overview';
  const first=await (await call(url+'?location='+hall.id,'GET',undefined,session)).json();
  assert.equal(first.total,12); assert.equal(first.rows.length,10); assert.equal(first.rows[0].level,'optimal');
  const second=await (await call(url+'?location='+hall.id+'&page=2','GET',undefined,session)).json();
  assert.equal(second.rows.length,2); assert.ok(first.rows[9].id>second.rows[0].id);
  // Alerts follow the latest measurement: earlier abnormal readings are not turned into alerts afterwards.
  const alerts=await (await call('/api/pre-storage-setup/alerts?location='+hall.id,'GET',undefined,session)).json();
  assert.ok(alerts.alerts.every(row=>row.problems.every(problem=>problem.key==='OVERDUE')), 'older abnormal readings are not reconstructed as alerts');
  const missing=await db.preStorageLocation.create({data:{organizationId:orgA.id,name:'No measurements',surfaceArea:100,containerFootprint:2,containerType:'M01',wasteProfile:'M01',preStorageFor:'Test'}});
  const unknown=await (await call('/api/pre-storage-setup/alerts?location='+missing.id,'GET',undefined,session)).json();
  assert.deepEqual(unknown.noData.map(row=>row.locationId),[missing.id]); assert.equal(unknown.alerts.length,0);
  assert.equal((await call('/api/final-storage-setup/overview','GET',undefined,session)).status,403);
  assert.equal((await call(url+'?page=0','GET',undefined,session)).status,400);
  const foreign=await db.preStorageLocation.create({data:{organizationId:orgB.id,name:'Foreign',surfaceArea:100,containerFootprint:2,containerType:'M01',wasteProfile:'M01',preStorageFor:'Test'}});
  assert.equal((await call(url+'?location='+foreign.id,'GET',undefined,session)).status,404);
});

integration('workspace counters link to matching filtered receiving and transfer lists', async () => {
  for (const [email, area] of [['PRE_STORAGE@areas.example','pre-storage'],['FINAL_STORAGE@areas.example','final-storage']]) {
    const user=await db.userProfile.findFirstOrThrow({where:{email}});
    const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
    const dashboard=await (await call('/api/workspace','GET',undefined,session)).json();
    for(const [label,count,href] of dashboard.workspaces[0].metrics.filter(metric=>metric[2])) {
      const query = new URL(href,base).search;
      const response=await call(`/api/${area}-setup/overview${query}`,'GET',undefined,session);
      assert.equal(response.status,200,href);
      const list=await response.json();
      assert.equal(list.total,count,href);
      assert.ok(list.rows.length<=10);
    }
    assert.equal((await call(`/api/${area}-setup/overview?view=transfers&status=invalid`,'GET',undefined,session)).status,400);
  }
  const largePage=await (await call('/api/pre-storage-setup/overview?page=2147483647')).json();
  assert.equal(largePage.page,largePage.totalPages);
});

integration('final receipt confirmations are versioned, scoped and safely replayable', async () => {
  const user=await db.userProfile.findFirstOrThrow({where:{email:'FINAL_STORAGE@areas.example'}});
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const employee=await db.finalStorageResponsibleEmployee.create({data:{organizationId:orgA.id,name:'Test',surname:'Receiver',dateOfBirth:new Date('1990-01-01'),address:'Test',qualifications:'Test',safetyTraining:true}});
  const room=await db.finalStorageLocation.create({data:{organizationId:orgA.id,name:'Confirmation test',containerType:'M01',surfaceArea:100,containerFootprint:2,depth:10}});
  const transfer=await db.storageTransferRequest.create({data:{organizationId:orgA.id,requestedQuantity:2,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id,preStorageStatus:'accepted',finalStorageStatus:'transportPending'}});
  const path='/api/final-storage-setup/final-storage-transver-request';
  const body={operationType:'FINAL_STORAGE_ACCEPT_RESPONSE',data:{id:transfer.id,expectedVersion:0,actionKey:require('node:crypto').randomUUID()}};
  assert.equal((await call(path,'PUT',{...body,data:{...body.data,expectedVersion:1}},session)).status,409);
  assert.equal(await db.transferAction.count({where:{transferId:transfer.id}}),0);
  const response=await call(path,'PUT',body,session); assert.equal(response.status,200);
  const saved=await response.json(); assert.equal(saved.result.actorId,user.id); assert.equal(saved.result.quantity,2); assert.ok(saved.result.createdAt);
  const replay=await call(path,'PUT',body,session); assert.equal(replay.status,200);
  assert.equal((await replay.json()).result.id,saved.result.id);
  assert.equal((await call(path,'PUT',{...body,data:{...body.data,expectedVersion:1}},session)).status,409);
  assert.equal(await db.transferAction.count({where:{transferId:transfer.id}}),1);
  const updated=await db.storageTransferRequest.findUniqueOrThrow({where:{id:transfer.id}});
  assert.equal(updated.version,1); assert.equal(updated.finalStorageStatus,'accepted'); assert.equal(updated.preStorageStatus,'completed');
  const other=await db.storageTransferRequest.create({data:{organizationId:orgA.id,requestedQuantity:3,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id,preStorageStatus:'accepted',finalStorageStatus:'transportPending'}});
  const revision={operationType:'FINAL_STORAGE_REJECT_RESPONSE',data:{id:other.id,expectedVersion:0,actionKey:require('node:crypto').randomUUID()}};
  assert.equal((await call(path,'PUT',revision,session)).status,400);
  const returned=await call(path,'PUT',{...revision,data:{...revision.data,reason:'Review destination before receipt'}},session);
  assert.equal(returned.status,200); assert.equal((await returned.json()).result.reason,'Review destination before receipt');
  assert.equal((await db.storageTransferRequest.findUniqueOrThrow({where:{id:other.id}})).preStorageStatus,'pending');
  await db.storageTransferRequest.update({where:{id:other.id},data:{organizationId:orgB.id}});
  assert.equal((await call(path,'PUT',{...body,data:{id:other.id,expectedVersion:1,actionKey:require('node:crypto').randomUUID()}},session)).status,404);
});


integration('departed shipment corrections require review, keep before/after and replay without duplicates', async () => {
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Before correction',driverName:'Driver',registrationPlates:'COR-1',truckStatus:'OUT'}});
  const expected={companyName:shipment.companyName,driverName:shipment.driverName,registrationPlates:shipment.registrationPlates,truckStatus:'OUT'};
  const input={id:shipment.id,companyName:'After correction',driverName:'Driver',registrationPlates:'COR-1',expected,actionKey:require('node:crypto').randomUUID(),reason:'Correct a transcription error'};
  const path='/api/shipping-informations';
  assert.equal((await call(path,'PUT',{updatedTruckData:{...input,reason:''}})).status,400);
  assert.equal((await call(path,'PUT',{updatedTruckData:{...input,expected:{...expected,companyName:'Stale'}}})).status,409);
  assert.equal(await db.shippingCorrection.count({where:{shipmentId:shipment.id}}),0);
  const response=await call(path,'PUT',{updatedTruckData:input}); assert.equal(response.status,200);
  const saved=(await response.json()).correction;
  assert.equal(saved.before.companyName,'Before correction'); assert.equal(saved.after.companyName,'After correction'); assert.equal(saved.actorId,admin.id);
  const replay=await call(path,'PUT',{updatedTruckData:input}); assert.equal(replay.status,200); assert.equal((await replay.json()).correction.id,saved.id);
  assert.equal((await call(path,'PUT',{updatedTruckData:{...input,reason:'Different reason'}})).status,409);
  assert.equal(await db.shippingCorrection.count({where:{shipmentId:shipment.id}}),1);
  const detail=await (await call(path+'/'+shipment.id)).json(); assert.equal(detail.corrections[0].id,saved.id); assert.equal(detail.corrections[0].fingerprint,undefined);
  const foreign=await db.shippingInformation.create({data:{organizationId:orgB.id,companyName:'Foreign',driverName:'D',registrationPlates:'F',truckStatus:'OUT'}});
  assert.equal((await call(path,'PUT',{updatedTruckData:{...input,id:foreign.id}})).status,404);
  assert.equal(await db.shippingCorrection.count({where:{shipmentId:foreign.id}}),0);
});

integration('transfer event history preserves recorded reasons, paginates and enforces work areas', async () => {
  const transfer=await db.storageTransferRequest.findFirstOrThrow({where:{organizationId:orgA.id,finalStorageStatus:'accepted'}});
  for(let i=0;i<12;i++) await db.transferAction.create({data:{organizationId:orgA.id,transferId:transfer.id,actionKey:require('node:crypto').randomUUID(),fingerprint:'test-event',action:'FINAL_STORAGE_REJECT_RESPONSE',quantity:2,actorId:admin.id,reason:'Recorded test reason '+i,createdAt:new Date(Date.UTC(2026,8,13,12,i))}});
  for(const [email,area] of [['PRE_STORAGE@areas.example','pre-storage'],['FINAL_STORAGE@areas.example','final-storage']]) {
    const user=await db.userProfile.findFirstOrThrow({where:{email}});
    const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
    const path=`/api/${area}-setup/overview?view=events`;
    const firstResponse=await call(path,'GET',undefined,session); assert.equal(firstResponse.status,200);
    const first=await firstResponse.json(); assert.equal(first.rows.length,10);
    const second=await (await call(path+'&page=2','GET',undefined,session)).json(); assert.ok(second.rows.length>0);
    assert.ok(!second.rows.some(row=>first.rows.some(previous=>previous.id===row.id)));
    const expected=await db.transferAction.count({where:{organizationId:orgA.id}}); assert.equal(first.total,expected);
    assert.ok(first.rows.every(row=>row.actorId && row.date && !row.fingerprint && !row.actionKey));
    assert.ok([...first.rows,...second.rows].some(row=>row.reason?.startsWith('Recorded test reason')));
    const other=area==='pre-storage'?'final-storage':'pre-storage';
    assert.equal((await call(`/api/${other}-setup/overview?view=events`,'GET',undefined,session)).status,403);
  }
  const room=await db.finalStorageLocation.create({data:{organizationId:orgB.id,name:'Foreign events room',containerType:'M01',surfaceArea:100,containerFootprint:2,depth:10}});
  assert.equal((await call('/api/final-storage-setup/overview?view=events&location='+room.id)).status,404);
  const hall=await db.preStorageLocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  assert.equal((await call('/api/pre-storage-setup/overview?view=events&location='+hall.id)).status,400);
});

integration('new transfer requests and pre-storage decisions record atomic events', async () => {
  const finalUser=await db.userProfile.findFirstOrThrow({where:{email:'FINAL_STORAGE@areas.example'}});
  const preUser=await db.userProfile.findFirstOrThrow({where:{email:'PRE_STORAGE@areas.example'}});
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const finalCookie=await session(finalUser), preCookie=await session(preUser);
  const room=await db.finalStorageLocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const requester=await db.finalStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const approver=await db.preStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const path='/api/final-storage-setup/final-storage-transver-request';
  const body={requestedQuantity:2,requestedByRoom:room.name,requestedByEmployeeId:requester.id,finalStorageLocationId:room.id,actionKey:require("node:crypto").randomUUID()};
  const response=await call(path,'POST',body,finalCookie); assert.equal(response.status,200);
  const {transferId}=await response.json();
  const countBefore=await db.storageTransferRequest.count({where:{organizationId:orgA.id}});
  const repeat=await call(path,'POST',body,finalCookie); assert.equal(repeat.status,200); assert.equal((await repeat.json()).transferId,transferId);
  assert.equal((await call(path,'POST',{...body,requestedQuantity:3},finalCookie)).status,409);
  assert.equal((await call(path,'POST',{...body,actionKey:require('node:crypto').randomUUID(),requestedByRoom:'Outdated room name'},finalCookie)).status,409);
  assert.equal((await call(path,'POST',{...body,actionKey:require('node:crypto').randomUUID(),requestedByEmployeeId:2147483647},finalCookie)).status,404);
  assert.equal(await db.storageTransferRequest.count({where:{organizationId:orgA.id}}),countBefore);

  const initial=await db.transferAction.findFirstOrThrow({where:{transferId}});
  assert.equal(initial.action,'TRANSFER_REQUESTED'); assert.equal(initial.actorId,finalUser.id); assert.equal(initial.quantity,2);
  const source=await db.receiptAllocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const approval={operationType:'PRE_STORAGE_ACCEPT_REQUEST',data:{id:transferId,receiptAllocationId:source.id,requestedQuantity:2,approvedByEmployeeId:approver.id,expectedVersion:0,actionKey:require('node:crypto').randomUUID()}};
  assert.equal((await call(path,'PUT',{...approval,data:{...approval.data,approvedByEmployeeId:2147483647}},preCookie)).status,404);
  assert.equal(await db.transferAction.count({where:{transferId}}),1);
  assert.equal((await db.storageTransferRequest.findUniqueOrThrow({where:{id:transferId}})).preStorageStatus,'pending');
  assert.equal((await call(path,'PUT',approval,preCookie)).status,200);
  const replay=await call(path,'PUT',approval,preCookie); assert.equal(replay.status,200); assert.equal((await replay.json()).replayed,true);
  assert.equal((await call(path,'PUT',{...approval,data:{...approval.data,requestedQuantity:3}},preCookie)).status,409);
  assert.equal((await call(path,'PUT',{...approval,data:{...approval.data,actionKey:require('node:crypto').randomUUID()}},preCookie)).status,409);
  const approved=await db.transferAction.findFirstOrThrow({where:{transferId,action:'PRE_STORAGE_ACCEPT_REQUEST'}});
  assert.equal(approved.actorId,preUser.id); assert.equal(await db.transferAction.count({where:{transferId}}),2);
  const confirmation={operationType:'FINAL_STORAGE_ACCEPT_RESPONSE',data:{id:transferId,expectedVersion:1,actionKey:require('node:crypto').randomUUID()}};
  assert.equal((await call(path,'PUT',confirmation,finalCookie)).status,200);
  const actions=await db.transferAction.findMany({where:{transferId},orderBy:{id:'asc'}});
  assert.deepEqual(actions.map(row=>row.action),['TRANSFER_REQUESTED','PRE_STORAGE_ACCEPT_REQUEST','FINAL_STORAGE_ACCEPT_RESPONSE']);
  const rejectedResponse=await call(path,'POST',{...body,actionKey:require('node:crypto').randomUUID()},finalCookie); assert.equal(rejectedResponse.status,200);
  const rejectedId=(await rejectedResponse.json()).transferId;
  assert.equal((await call(path,'PUT',{operationType:'PRE_STORAGE_REJECT_REQUEST',data:{id:rejectedId,expectedVersion:0,actionKey:require('node:crypto').randomUUID(),reason:'Destination needs review'}},preCookie)).status,200);
  const rejection=await db.transferAction.findFirstOrThrow({where:{transferId:rejectedId,action:'PRE_STORAGE_REJECT_REQUEST'}});
  assert.equal(rejection.actorId,preUser.id); assert.equal(rejection.reason,'Destination needs review');
});

integration('final receipt history distinguishes saved confirmation time from legacy request dates', async () => {
  const employee=await db.finalStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const room=await db.finalStorageLocation.create({data:{organizationId:orgA.id,name:'Receipt dates test',containerType:'M01',surfaceArea:100,containerFootprint:2,depth:10}});
  const data={organizationId:orgA.id,requestedQuantity:2,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id,preStorageStatus:'completed',finalStorageStatus:'accepted',createdAt:new Date('2026-09-01T09:00:00Z')};
  const modern=await db.storageTransferRequest.create({data});
  const legacy=await db.storageTransferRequest.create({data:{...data,createdAt:new Date('2026-09-02T09:00:00Z')}});
  const event=await db.transferAction.create({data:{organizationId:orgA.id,transferId:modern.id,action:'FINAL_STORAGE_ACCEPT_RESPONSE',quantity:2,actorId:admin.id,actionKey:require('node:crypto').randomUUID(),fingerprint:'receipt-date-test',createdAt:new Date('2026-09-14T12:00:00Z')}});
  const response=await call('/api/final-storage-setup/overview?view=receipts&location='+room.id);
  assert.equal(response.status,200);
  const result=await response.json(); assert.equal(result.total,2);
  const recorded=result.rows.find(row=>row.id===modern.id), old=result.rows.find(row=>row.id===legacy.id);
  assert.equal(recorded.date,event.createdAt.toISOString()); assert.equal(recorded.confirmationId,event.id); assert.equal(recorded.actorId,admin.id);
  assert.equal(recorded.requestCreatedAt,data.createdAt.toISOString());
  assert.equal(old.date,null); assert.equal(old.actorId,null); assert.equal(old.confirmationId,null);
  assert.equal(old.missingDateLabel,'Receipt time not recorded'); assert.match(old.note,/Legacy record/);
});

integration('departure review records server time once and prevents stale or cross-area changes', async () => {
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Departure test',driverName:'Driver',registrationPlates:'DEP-1'}});
  const body={id:shipment.id,actionKey:require('node:crypto').randomUUID(),expected:{companyName:shipment.companyName,driverName:shipment.driverName,registrationPlates:shipment.registrationPlates,truckStatus:'IN'}};
  const path='/api/shipping-informations/departure';
  assert.equal((await call(path,'POST',{...body,expected:{...body.expected,driverName:'Stale'}})).status,409);
  assert.equal(await db.shipmentDeparture.count({where:{shipmentId:shipment.id}}),0);
  await db.userProfile.update({where:{id:admin.id},data:{role:'EMPLOYEE',workArea:'SHIPPING',administrator:false}});
  try {
    const response=await call(path,'POST',body); assert.equal(response.status,200);
    const saved=(await response.json()).departure; assert.equal(saved.actorId,admin.id);
    const row=await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}});
    assert.equal(row.truckStatus,'OUT'); assert.equal(row.exitDateTime.toISOString(),saved.createdAt);
    const replay=await call(path,'POST',body); assert.equal(replay.status,200); assert.equal((await replay.json()).departure.id,saved.id);
    assert.equal((await call(path,'POST',{...body,actionKey:require('node:crypto').randomUUID()})).status,409);
    assert.equal((await call('/api/shipping-informations','PATCH',{shippingStatusData:{id:shipment.id,truckStatus:'IN'}})).status,403);
    assert.equal(await db.shipmentDeparture.count({where:{shipmentId:shipment.id}}),1);
  } finally {await db.userProfile.update({where:{id:admin.id},data:{role:'ADMINISTRATOR',administrator:true,workArea:null}});}
  const pre=await db.userProfile.findFirstOrThrow({where:{email:'PRE_STORAGE@areas.example'}});
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(pre.id)}});
  assert.equal((await call(path,'POST',body,session)).status,403);
  const foreign=await db.shippingInformation.create({data:{organizationId:orgB.id,companyName:'Other',driverName:'Other',registrationPlates:'OTHER'}});
  assert.equal((await call(path,'POST',{...body,id:foreign.id,actionKey:require('node:crypto').randomUUID()})).status,404);
});

integration('measurements preserve zero and decimal values and replay without duplicate records', async () => {
  for (const pre of [true,false]) {
    const prefix=pre?'preStorage':'finalStorage', area=pre?'pre-storage':'final-storage';
    const model=pre?db.preStorageConditions:db.finalStorageCondition;
    const room=await db[prefix+'Location'].findFirstOrThrow({where:{organizationId:orgA.id}});
    const employee=await db[prefix+'ResponsibleEmployee'].findFirstOrThrow({where:{organizationId:orgA.id}});
    const user=await db.userProfile.findFirstOrThrow({where:{email:(pre?'PRE_STORAGE':'FINAL_STORAGE')+'@areas.example'}});
    const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
    const path='/api/'+area+'-setup/'+area+'-conditions';
    const body={submissionKey:require('node:crypto').randomUUID(),[prefix+'LocationId']:room.id,[prefix+'ResponsibleEmployeeId']:employee.id,[prefix+'Temperature']:0,[prefix+'RadiationLevel']:0,[prefix+'Humidity']:0,[prefix+'Pressure']:0,recordedById:admin.id};
    const response=await call(path,'POST',body,session); assert.equal(response.status,200);
    const saved=(await response.json()).measurement; assert.equal(saved.recordedById,user.id);
    for(const key of ['Temperature','RadiationLevel','Humidity','Pressure']) assert.equal(saved[prefix+key],0);
    const repeat=await call(path,'POST',body,session); assert.equal(repeat.status,200); assert.equal((await repeat.json()).measurement.id,saved.id);
    assert.equal(await model.count({where:{submissionKey:body.submissionKey}}),1);
    assert.equal((await call(path,'POST',{...body,[prefix+'Humidity']:2},session)).status,409);
    const decimals={...body,submissionKey:require('node:crypto').randomUUID(),[prefix+'Humidity']:42.5,[prefix+'Pressure']:pre?1013:1013.25};
    const decimalResponse=await call(path,'POST',decimals,session); assert.equal(decimalResponse.status,200);
    const decimalRecord=(await decimalResponse.json()).measurement; assert.equal(decimalRecord[prefix+'Humidity'],42.5); assert.equal(decimalRecord[prefix+'Pressure'],decimals[prefix+'Pressure']);
    const count=await model.count({where:{organizationId:orgA.id}});
    for(const patch of [{submissionKey:null},{[prefix+'Humidity']:101},{[prefix+'Temperature']:'12abc'},...(pre?[{[prefix+'Pressure']:1013.25}]:[])]) {
      assert.equal((await call(path,'POST',{...body,submissionKey:require('node:crypto').randomUUID(),...patch},session)).status,400);
    }
    assert.equal((await call(path,'POST',{...body,submissionKey:require('node:crypto').randomUUID(),[prefix+'LocationId']:2147483647},session)).status,404);
    const otherUser=await db.userProfile.findFirstOrThrow({where:{email:(pre?'FINAL_STORAGE':'PRE_STORAGE')+'@areas.example'}});
    const otherSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(otherUser.id)}});
    assert.equal((await call(path,'POST',body,otherSession)).status,403);
    assert.equal(await model.count({where:{organizationId:orgA.id}}),count);
  }
});

integration('arrival review records one shipment and preserves confirmation after changes or deletion', async () => {
  const path='/api/shipping-informations';
  const body={companyName:' Review arrival ',driverName:'Driver',registrationPlates:'ARR-1',actionKey:require('node:crypto').randomUUID()};
  assert.equal((await call(path,'POST',{...body,companyName:'  '})).status,400);
  assert.equal((await call(path,'POST',{...body,actionKey:null})).status,400);
  const response=await call(path,'POST',body); assert.equal(response.status,200);
  const saved=(await response.json()).arrival;
  assert.equal(saved.actorId,admin.id); assert.equal(saved.snapshot.companyName,'Review arrival');
  const shipment=await db.shippingInformation.findUniqueOrThrow({where:{id:saved.shipmentId}});
  assert.equal(shipment.truckStatus,'IN'); assert.equal(shipment.entryDateTime.toISOString(),saved.createdAt);
  assert.equal((await call(path,'POST',{...body,driverName:'Changed'})).status,409);
  await db.shippingInformation.update({where:{id:shipment.id},data:{truckStatus:'OUT',driverName:'Later correction'}});
  const repeat=await call(path,'POST',body); assert.equal(repeat.status,200); assert.deepEqual((await repeat.json()).arrival,saved);
  await db.shippingInformation.delete({where:{id:shipment.id}});
  const count=await db.shippingInformation.count();
  assert.equal((await call(path,'POST',body)).status,200);
  assert.equal(await db.shippingInformation.count(),count);
  assert.equal(await db.shipmentArrival.count({where:{actionKey:body.actionKey}}),1);
});

integration('administrative status and date corrections preserve audit and reject stale or invalid changes', async () => {
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Status audit',driverName:'Driver',registrationPlates:'AUD-1',entryDateTime:new Date('2026-09-01T10:00:00Z')}});
  const expected={truckStatus:'IN',entryDateTime:shipment.entryDateTime.toISOString(),exitDateTime:null};
  const input={id:shipment.id,actionKey:require('node:crypto').randomUUID(),reason:'Correct departure record',expected,truckStatus:'OUT',entryDateTime:expected.entryDateTime,exitDateTime:'2026-09-01T11:00:00.000Z'};
  const send=data=>call('/api/shipping-informations','PATCH',{shippingStatusData:data});
  assert.equal((await send({...input,reason:' '})).status,400);
  assert.equal((await send({...input,exitDateTime:'2026-08-31T11:00:00.000Z'})).status,400);
  assert.equal((await send({...input,truckStatus:'IN'})).status,400);
  const response=await send(input); assert.equal(response.status,200);
  const correction=(await response.json()).correction;
  assert.equal(correction.actorId,admin.id); assert.deepEqual(correction.before,expected); assert.equal(correction.after.truckStatus,'OUT');
  const replay=await send(input); assert.equal(replay.status,200); assert.equal((await replay.json()).correction.id,correction.id);
  assert.equal((await send({...input,reason:'Different reason'})).status,409);
  assert.equal((await send({...input,actionKey:require('node:crypto').randomUUID()})).status,409);
  assert.equal(await db.shippingCorrection.count({where:{shipmentId:shipment.id}}),1);
  const employee=await db.userProfile.findFirstOrThrow({where:{email:'PRE_STORAGE@areas.example'}});
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(employee.id)}});
  assert.equal((await call('/api/shipping-informations','PATCH',{shippingStatusData:input},session)).status,403);
  const foreign=await db.shippingInformation.create({data:{organizationId:orgB.id,companyName:'Other',driverName:'Other',registrationPlates:'OTHER'}});
  assert.equal((await send({...input,id:foreign.id,actionKey:require('node:crypto').randomUUID()})).status,404);
  const corrected=await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}});
  assert.equal(corrected.exitDateTime.toISOString(),input.exitDateTime);
  assert.equal((await send({...input,actionKey:require('node:crypto').randomUUID(),expected:correction.after,truckStatus:'IN',exitDateTime:null,reason:'Correct mistaken departure status'})).status,200);
  assert.equal((await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}})).exitDateTime,null);
});

integration('account changes require review, preserve access audit and replay without revoking twice', async () => {
  const target=await db.userProfile.create({data:{organizationId:orgA.id,companyId:1,companyName:'A',address:'A',email:'audit-user@example.test',username:'audit.user',displayName:'Audit User',administrator:false,password:'not-a-login-hash',role:'EMPLOYEE',workArea:'SHIPPING',active:true}});
  const keys=['username','email','displayName','role','workArea','active'];
  const expected=Object.fromEntries(keys.map(key=>[key === 'active' ? 'enabled' : key,target[key]]));
  const body={...expected,id:target.id,enabled:true,workArea:'PRE_STORAGE',expected,reason:'Reassign to receiving team',actionKey:require('node:crypto').randomUUID()};
  const send=input=>call('/api/users','PUT',input);
  assert.equal((await send({...body,reason:''})).status,400);
  const response=await send(body); assert.equal(response.status,200);
  const change=(await response.json()).change;
  assert.deepEqual(change.before,{role:'EMPLOYEE',workArea:'SHIPPING',active:true});
  assert.deepEqual(change.after,{role:'EMPLOYEE',workArea:'PRE_STORAGE',active:true});
  assert.deepEqual(change.changedFields,['workArea']); assert.equal(change.actorId,admin.id);
  assert.ok(!JSON.stringify(change).includes(target.password)); assert.ok(!JSON.stringify(change).includes(target.email));
  const updated=await db.userProfile.findUniqueOrThrow({where:{id:target.id}});
  assert.equal(updated.sessionVersion,target.sessionVersion+1);
  const replay=await send(body);assert.equal(replay.status,200);assert.equal((await replay.json()).change.id,change.id);
  assert.equal((await db.userProfile.findUniqueOrThrow({where:{id:target.id}})).sessionVersion,updated.sessionVersion);
  assert.equal((await send({...body,actionKey:require('node:crypto').randomUUID(),workArea:'FINAL_STORAGE'})).status,409);
  assert.equal((await send({...body,reason:'Changed reason'})).status,409);
  assert.equal(await db.accountChange.count({where:{targetUserId:target.id}}),1);
  const list=await (await call('/api/users')).json();assert.ok(list.changes.some(row=>row.id===change.id));
  assert.ok(!('fingerprint' in list.changes[0]));
});

integration('shipment timeline distinguishes actual events from legacy dates and isolates audit visibility', async () => {
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Timeline',driverName:'Driver',registrationPlates:'TIME-1',truckStatus:'OUT',entryDateTime:new Date('2026-09-01'),exitDateTime:new Date('2026-09-02')}});
  const path='/api/shipping-informations/'+shipment.id;
  const legacy=await (await call(path)).json();
  assert.equal(legacy.timeline.events.length,0);assert.ok(legacy.timeline.notes.some(note=>note.includes('No separate arrival event')));
  const arrival=await db.shipmentArrival.create({data:{organizationId:orgA.id,shipmentId:shipment.id,actorId:admin.id,actionKey:require('node:crypto').randomUUID(),fingerprint:'test',snapshot:{},createdAt:new Date('2026-09-03')}});
  await db.shippingCorrection.create({data:{organizationId:orgA.id,shipmentId:shipment.id,actorId:admin.id,actionKey:require('node:crypto').randomUUID(),fingerprint:'test',reason:'Timeline test correction',before:{},after:{},createdAt:new Date('2026-09-04')}});
  await db.shipmentDeparture.create({data:{organizationId:orgB.id,shipmentId:shipment.id,actorId:admin.id,actionKey:require('node:crypto').randomUUID(),fingerprint:'foreign',snapshot:{}}});
  const timeline=(await (await call(path)).json()).timeline;
  assert.equal(timeline.events.length,2);assert.equal(timeline.events[0].title,'Administrative correction recorded');
  assert.equal(timeline.events[1].date,arrival.createdAt.toISOString());
  assert.ok(!timeline.events.some(row=>row.title==='Departure recorded'));
  const session='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  const employeeResponse=await call(path,'GET',undefined,session);assert.equal(employeeResponse.status,200);
  const employeeTimeline=(await employeeResponse.json()).timeline;
  assert.equal(employeeTimeline.events.length,1);assert.ok(!JSON.stringify(employeeTimeline).includes('Timeline test correction'));
});

integration('linked transfer sources prevent over-allocation and preserve revision and receipt lineage', async () => {
  const original=await db.receiptAllocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const receipt=await db.preStorageEntry.create({data:{organizationId:orgA.id,quantity:3,preStorageLocationId:original.locationId,responsiblePreStorageEmployeeId:original.responsibleEmployeeId}});
  const source=await db.receiptAllocation.create({data:{organizationId:orgA.id,receiptId:receipt.id,shipmentId:original.shipmentId,containerProfileId:original.containerProfileId,locationId:original.locationId,quantity:3,actorId:admin.id,responsibleEmployeeId:original.responsibleEmployeeId}});
  const employee=await db.finalStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const room=await db.finalStorageLocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const makeTransfer=()=>db.storageTransferRequest.create({data:{organizationId:orgA.id,requestedQuantity:2,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id}});
  const first=await makeTransfer(), second=await makeTransfer();
  const path='/api/final-storage-setup/final-storage-transver-request';
  const approve=id=>({operationType:'PRE_STORAGE_ACCEPT_REQUEST',data:{id,expectedVersion:0,actionKey:require('node:crypto').randomUUID(),requestedQuantity:2,approvedByEmployeeId:original.responsibleEmployeeId,receiptAllocationId:source.id}});
  const missing=approve(first.id); missing.data.receiptAllocationId=2147483647;
  assert.equal((await call(path,'PUT',missing)).status,404);
  const foreignSource=await db.receiptAllocation.create({data:{organizationId:orgB.id,receiptId:receipt.id,shipmentId:original.shipmentId,containerProfileId:original.containerProfileId+100000,locationId:original.locationId,quantity:3,actorId:admin.id,responsibleEmployeeId:original.responsibleEmployeeId}});
  const foreign=approve(first.id);foreign.data.receiptAllocationId=foreignSource.id;
  assert.equal((await call(path,'PUT',foreign)).status,404);
  assert.ok(!(await (await call('/api/pre-storage-setup/receipt-sources')).json()).sources.some(row=>row.id===foreignSource.id));
  const bodies=[approve(first.id),approve(second.id)];
  const responses=await Promise.all(bodies.map(body=>call(path,'PUT',body)));
  assert.deepEqual(responses.map(row=>row.status).sort(),[200,409]);
  const winner=bodies[responses.findIndex(row=>row.status===200)];
  assert.equal((await call(path,'PUT',winner)).status,200);
  assert.equal(await db.transferSource.count({where:{receiptAllocationId:source.id,state:'reserved'}}),1);
  const roomResponse=await call('/api/final-storage-setup/'+room.id);
  assert.equal(roomResponse.status,200);
  const linkedRequest=(await roomResponse.json()).finalStorageDataById.storageTransferRequests.find(row=>row.id===winner.data.id);
  assert.equal(linkedRequest.source.containerProfileId,source.containerProfileId);
  assert.equal(linkedRequest.source.quantity,2);

  const sources=await (await call('/api/pre-storage-setup/receipt-sources')).json();
  assert.equal(sources.sources.find(row=>row.id===source.id).available,1);
  const revision={operationType:'FINAL_STORAGE_REJECT_RESPONSE',data:{id:winner.data.id,expectedVersion:1,actionKey:require('node:crypto').randomUUID(),reason:'Review selected source'}};
  assert.equal((await call(path,'PUT',revision)).status,200);
  assert.equal((await call(path,'PUT',revision)).status,200);
  assert.equal((await db.transferSource.findFirstOrThrow({where:{receiptAllocationId:source.id}})).state,'released');
  const reapprove={...winner,data:{...winner.data,expectedVersion:2,requestedQuantity:3,actionKey:require('node:crypto').randomUUID()}};
  assert.equal((await call(path,'PUT',reapprove)).status,200);
  const confirmation={operationType:'FINAL_STORAGE_ACCEPT_RESPONSE',data:{id:winner.data.id,expectedVersion:3,actionKey:require('node:crypto').randomUUID()}};
  const prePath='/api/pre-storage-setup/'+source.locationId, finalPath='/api/final-storage-setup/'+room.id;
  const beforePre=(await (await call(prePath)).json()).preStorageDataById.inventory.quantity;
  const beforeFinal=(await (await call(finalPath)).json()).finalStorageDataById.inventory.quantity;
  const beforeStats=(await (await call('/api/stats')).json()).activeContainers;
  await db.finalStorageLocation.update({where:{id:room.id},data:{surfaceArea:1}});
  assert.equal((await call(path,'PUT',confirmation)).status,409);
  assert.equal((await db.storageTransferRequest.findUniqueOrThrow({where:{id:winner.data.id}})).version,3);
  assert.equal(await db.transferSource.count({where:{receiptAllocationId:source.id,state:'completed'}}),0);
  await db.finalStorageLocation.update({where:{id:room.id},data:{surfaceArea:room.surfaceArea}});

  assert.equal((await call(path,'PUT',confirmation)).status,200);
  assert.equal((await call(path,'PUT',confirmation)).status,200);
  const completed=await db.transferSource.findFirstOrThrow({where:{receiptAllocationId:source.id,state:'completed'}});
  assert.equal(completed.quantity,3);
  assert.equal((await (await call(prePath)).json()).preStorageDataById.inventory.quantity,beforePre-3);
  assert.equal((await (await call(finalPath)).json()).finalStorageDataById.inventory.quantity,beforeFinal+3);
  assert.equal((await (await call('/api/stats')).json()).activeContainers,beforeStats);
  const preList=(await (await call('/api/pre-storage-setup/pre-storage-location')).json()).preStorageLocationData;
  const finalList=(await (await call('/api/final-storage-setup/final-storage-location')).json()).finalStorageLocationData;
  assert.equal(preList.find(row=>row.id===source.locationId).inventory.quantity,beforePre-3);
  assert.equal(finalList.find(row=>row.id===room.id).inventory.quantity,beforeFinal+3);

  assert.ok(!(await (await call('/api/pre-storage-setup/receipt-sources')).json()).sources.some(row=>row.id===source.id));
  const timeline=(await (await call('/api/shipping-informations/'+source.shipmentId)).json()).timeline;
  const linked=timeline.events.filter(row=>row.detail.startsWith('Transfer #'+winner.data.id+' ·'));
  assert.deepEqual(linked.map(row=>row.title).sort(),['Final storage receipt recorded','Transfer approved','Transfer approved','Transfer returned for revision'].sort());
});

integration('legacy stored quantities remain separate from unlinked completed transfers', async () => {
  const employee=await db.finalStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const room=await db.finalStorageLocation.create({data:{organizationId:orgA.id,name:'Legacy count check',containerType:'M01',surfaceArea:100,containerFootprint:2,depth:10,quantity:7}});
  await db.storageTransferRequest.create({data:{organizationId:orgA.id,requestedQuantity:5,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id,preStorageStatus:'completed',finalStorageStatus:'accepted'}});
  const response=await call('/api/final-storage-setup/'+room.id); assert.equal(response.status,200);
  const inventory=(await response.json()).finalStorageDataById.inventory;
  assert.deepEqual(inventory,{quantity:7,storedQuantity:7,linkedReceived:0,corrected:0,unlinkedTransfers:1});
  const stats=await (await call('/api/stats')).json(); assert.ok(stats.unlinkedFinalTransfers>=1);
});


integration('account creation review is atomic, replayable and does not reset credentials', async () => {
  const bcrypt = require('bcryptjs');
  const input = { actionKey:require('node:crypto').randomUUID(), displayName:'Creation Review', username:'creation.review', email:'creation.review@test.example', password:'Initial-creation-password-123', role:'EMPLOYEE', workArea:'PRE_STORAGE' };
  const send = body => call('/api/users','POST',body);
  assert.equal((await send({...input,actionKey:undefined})).status,400);
  assert.equal((await send({...input,workArea:null})).status,400);
  const responses = await Promise.all([send(input),send(input)]);
  assert.ok(responses.some(response=>response.status===201));
  assert.ok(responses.every(response=>[200,201,409].includes(response.status)));
  const created = await (await send(input)).json();
  assert.equal(created.replayed,true);
  const id = created.creation.targetUserId;
  assert.equal(await db.userProfile.count({where:{username:input.username}}),1);
  assert.equal(await db.accountCreation.count({where:{targetUserId:id}}),1);
  const receipt = await db.accountCreation.findFirstOrThrow({where:{targetUserId:id}});
  assert.equal(receipt.actorId,admin.id); assert.equal(receipt.workArea,'PRE_STORAGE');
  assert.doesNotMatch(JSON.stringify(receipt),/Initial-creation-password|creation.review@test|Creation Review/);
  assert.equal((await send({...input,workArea:'SHIPPING'})).status,409);
  assert.equal((await send({...input,actionKey:require('node:crypto').randomUUID()})).status,422);
  assert.equal(await db.accountCreation.count({where:{targetUserId:id}}),1);
  const newHash = await bcrypt.hash('User-changed-password-123',4);
  await db.userProfile.update({where:{id},data:{password:newHash}});
  assert.equal((await send(input)).status,200);
  assert.equal((await db.userProfile.findUniqueOrThrow({where:{id}})).password,newHash);
  const records = await (await call('/api/users')).json();
  assert.ok(records.creations.some(row=>row.targetUserId===id));
  assert.doesNotMatch(JSON.stringify(records.creations),/fingerprint|actionKey|password/);
  const outsider = await db.userProfile.create({data:{email:'creation.other@test.example',password:'unused',role:'ADMINISTRATOR',administrator:true,organizationId:orgB.id,companyId:orgB.id,companyName:'B',address:''}});
  const otherSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(outsider.id)}});
  assert.equal((await call('/api/users','POST',input,otherSession)).status,422);
  assert.deepEqual((await (await call('/api/users','GET',undefined,otherSession)).json()).creations,[]);
  const supervisor = await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const own = (await (await call('/api/users','GET',undefined,supervisorSession)).json()).creations;
  assert.ok(own.length>0); assert.ok(own.every(row=>row.actorId===supervisor.id));
});

integration('multi-source transfers validate every source and move all quantities atomically', async () => {
  const uuid = () => require('node:crypto').randomUUID();
  const original = await db.receiptAllocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const employee = await db.finalStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const hall = await db.preStorageLocation.create({data:{organizationId:orgA.id,name:'Multi-source hall',surfaceArea:100,containerFootprint:2,containerType:'M01',wasteProfile:'M01',preStorageFor:'Test'}});
  const receipt = await db.preStorageEntry.create({data:{organizationId:orgA.id,quantity:5,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:original.responsibleEmployeeId}});
  const sourceA = await db.receiptAllocation.create({data:{organizationId:orgA.id,receiptId:receipt.id,shipmentId:original.shipmentId,containerProfileId:original.containerProfileId,locationId:hall.id,quantity:2,actorId:admin.id,responsibleEmployeeId:original.responsibleEmployeeId}});
  const anotherProfile = await db.containerProfile.findFirstOrThrow({where:{id:{not:original.containerProfileId},organizationId:orgA.id}});
  const sourceB = await db.receiptAllocation.create({data:{organizationId:orgA.id,receiptId:receipt.id,shipmentId:original.shipmentId,containerProfileId:anotherProfile.id,locationId:hall.id,quantity:3,actorId:admin.id,responsibleEmployeeId:original.responsibleEmployeeId}});
  const foreign = await db.receiptAllocation.findFirstOrThrow({where:{organizationId:orgB.id}});
  const room = await db.finalStorageLocation.create({data:{organizationId:orgA.id,name:'Multi-source destination',containerType:'M01',surfaceArea:100,containerFootprint:2,depth:10,quantity:0}});
  const makeTransfer = () => db.storageTransferRequest.create({data:{organizationId:orgA.id,requestedQuantity:5,requestedByRoom:room.name,requestedByEmployeeId:employee.id,finalStorageLocationId:room.id}});
  const first = await makeTransfer(), second = await makeTransfer();
  const path='/api/final-storage-setup/final-storage-transver-request';
  const selected=[{receiptAllocationId:sourceA.id,quantity:2},{receiptAllocationId:sourceB.id,quantity:3}];
  const approval = id => ({operationType:'PRE_STORAGE_ACCEPT_REQUEST',data:{id,expectedVersion:0,actionKey:uuid(),requestedQuantity:5,approvedByEmployeeId:original.responsibleEmployeeId,sources:selected}});
  const bad = approval(first.id);
  const send = data => call(path,'PUT',{...bad,data:{...bad.data,...data}});
  assert.equal((await send({sources:[]})).status,400);
  assert.equal((await send({sources:[selected[0],selected[0]],requestedQuantity:4})).status,400);
  assert.equal((await send({requestedQuantity:4})).status,400);
  assert.equal((await send({sources:[{...selected[0],quantity:0},selected[1]],requestedQuantity:3})).status,400);
  assert.equal((await send({receiptAllocationId:sourceA.id})).status,400);
  assert.equal((await send({sources:[selected[0],{receiptAllocationId:foreign.id,quantity:3}]})).status,404);
  assert.equal((await send({sources:[selected[0],{...selected[1],quantity:4}],requestedQuantity:6})).status,409);
  assert.equal(await db.transferSource.count({where:{transferId:first.id}}),0);
  assert.equal(await db.transferAction.count({where:{transferId:first.id}}),0);
  assert.equal((await db.storageTransferRequest.findUniqueOrThrow({where:{id:first.id}})).version,0);

  const attempts=[approval(first.id),approval(second.id)];
  const responses=await Promise.all(attempts.map(body=>call(path,'PUT',body)));
  assert.deepEqual(responses.map(row=>row.status).sort(),[200,409]);
  const winner=attempts[responses.findIndex(row=>row.status===200)];
  const transferId=winner.data.id;
  const replay=await call(path,'PUT',{...winner,data:{...winner.data,sources:[...selected].reverse()}});
  assert.equal(replay.status,200); assert.equal((await replay.json()).replayed,true);
  assert.equal(await db.transferSource.count({where:{transferId,state:'reserved'}}),2);
  assert.equal(await db.transferAction.count({where:{transferId}}),1);
  const detailPath='/api/final-storage-setup/'+room.id;
  const detail=(await (await call(detailPath)).json()).finalStorageDataById.storageTransferRequests.find(row=>row.id===transferId);
  assert.equal(detail.sources.length,2);assert.equal(detail.source,null);
  assert.equal(detail.sources.reduce((sum,row)=>sum+row.quantity,0),5);
  const revision={operationType:'FINAL_STORAGE_REJECT_RESPONSE',data:{id:transferId,expectedVersion:1,actionKey:uuid(),reason:'Check both receipts'}};
  assert.equal((await call(path,'PUT',revision)).status,200);
  assert.equal((await call(path,'PUT',revision)).status,200);
  assert.equal(await db.transferSource.count({where:{transferId,state:'released'}}),2);
  const available=(await (await call('/api/pre-storage-setup/receipt-sources')).json()).sources;
  assert.equal(available.find(row=>row.id===sourceA.id).available,2);
  assert.equal(available.find(row=>row.id===sourceB.id).available,3);
  const reapprove={...winner,data:{...winner.data,expectedVersion:2,actionKey:uuid()}};
  assert.equal((await call(path,'PUT',reapprove)).status,200);
  const confirmation={operationType:'FINAL_STORAGE_ACCEPT_RESPONSE',data:{id:transferId,expectedVersion:3,actionKey:uuid()}};
  // Both individual quantities fit four, but their combined outgoing quantity does not.
  await db.preStorageEntry.update({where:{id:receipt.id},data:{quantity:4}});
  assert.equal((await call(path,'PUT',confirmation)).status,409);
  assert.equal(await db.transferSource.count({where:{transferId,state:'completed'}}),0);
  assert.equal(await db.transferSource.count({where:{transferId,state:'reserved'}}),2);
  assert.equal((await db.storageTransferRequest.findUniqueOrThrow({where:{id:transferId}})).version,3);
  await db.preStorageEntry.update({where:{id:receipt.id},data:{quantity:5}});
  const before=(await (await call('/api/stats')).json()).activeContainers;
  assert.equal((await call(path,'PUT',confirmation)).status,200);
  assert.equal((await call(path,'PUT',confirmation)).status,200);
  assert.equal(await db.transferSource.count({where:{transferId,state:'completed'}}),2);
  assert.equal((await (await call('/api/pre-storage-setup/'+hall.id)).json()).preStorageDataById.inventory.quantity,0);
  assert.equal((await (await call(detailPath)).json()).finalStorageDataById.inventory.quantity,5);
  assert.equal((await (await call('/api/stats')).json()).activeContainers,before);
  const timeline=(await (await call('/api/shipping-informations/'+original.shipmentId)).json()).timeline.events.filter(row=>row.detail.startsWith('Transfer #'+transferId+' ·'));
  assert.equal(timeline.length,8);assert.equal(new Set(timeline.map(row=>row.key)).size,8);
});


integration('profile corrections preserve reviewed state and never rewrite received stock', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId:orgA.id}});
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Profile corrections',driverName:'Driver',registrationPlates:'CORRECT',truckStatus:'OUT'}});
  const profile=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:shipment.id,quantity:4,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'rejected'}});
  const path='/api/container-profile';
  const expected={quantity:4,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'rejected',truckStatus:'OUT'};
  const input={id:profile.id,quantity:5,locationOrigin:recordA.id,wasteProfile:waste.id,actionKey:uuid(),reason:'Correct counted quantity before receipt',expected};
  const send=(data,session=cookie)=>call(path,'PUT',{preparedData:data},session);
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const employeeSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  assert.equal((await send({...input,reason:undefined})).status,400);
  assert.equal((await send(input,supervisorSession)).status,403);
  assert.equal((await send(input,employeeSession)).status,403);
  assert.equal((await send({...input,locationOrigin:recordB.id})).status,404);
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:profile.id}}),0);
  assert.equal((await send({...input,quantity:4})).status,400);
  assert.equal((await send({...input,expected:{...expected,quantity:3}})).status,409);
  const attempts=[input,{...input,actionKey:uuid(),quantity:6}];
  const outcomes=await Promise.all(attempts.map(body=>send(body)));
  assert.deepEqual(outcomes.map(row=>row.status).sort(),[200,409]);
  const winning=attempts[outcomes.findIndex(row=>row.status===200)];
  const replay=await send(winning);assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);
  assert.equal((await send({...winning,reason:'Different reason'})).status,409);
  const audit=await db.containerCorrection.findFirstOrThrow({where:{containerProfileId:profile.id}});
  assert.deepEqual(audit.before,expected);
  assert.equal(audit.after.quantity,winning.quantity);assert.equal(audit.after.containerStatus,'pending');assert.equal(audit.actorId,admin.id);
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:profile.id}}),1);
  assert.equal((await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}})).status,'pending');
  const detailPath='/api/shipping-informations/'+shipment.id;
  const detail=await (await call(detailPath)).json();
  assert.equal(detail.containerCorrections[0].id,audit.id);
  assert.equal(detail.permissions.canDelete,true);
  assert.ok(detail.timeline.events.some(row=>row.title==='Container Profile corrected'));
  const employeeDetail=await (await call(detailPath,'GET',undefined,employeeSession)).json();
  assert.deepEqual(employeeDetail.containerCorrections,[]);
  assert.ok(!employeeDetail.timeline.events.some(row=>row.title==='Container Profile corrected'));

  // Supervision may correct an unreceived IN profile; a reviewed OUT snapshot cannot be reused after reopening.
  await db.shippingInformation.update({where:{id:shipment.id},data:{truckStatus:'IN'}});
  const next={...input,quantity:7,actionKey:uuid(),expected:audit.after};
  assert.equal((await send(next,supervisorSession)).status,409);
  next.expected={...audit.after,truckStatus:'IN'};
  assert.equal((await send(next,supervisorSession)).status,200);
  assert.equal((await (await call(detailPath,'GET',undefined,supervisorSession)).json()).containerCorrections.length,2);
  const received=await db.containerProfile.update({where:{id:profile.id},data:{containerStatus:'accepted'}});
  const hall=await db.preStorageLocation.findFirstOrThrow({where:{organizationId:orgA.id}});
  const responsible=await db.preStorageResponsibleEmployee.findFirstOrThrow({where:{organizationId:orgA.id}});
  const receipt=await db.preStorageEntry.create({data:{organizationId:orgA.id,quantity:7,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:responsible.id}});
  await db.receiptAllocation.create({data:{organizationId:orgA.id,receiptId:receipt.id,shipmentId:shipment.id,containerProfileId:profile.id,locationId:hall.id,quantity:7,actorId:admin.id,responsibleEmployeeId:responsible.id}});
  const lockedChange={...input,quantity:8,actionKey:uuid(),expected:{...next.expected,quantity:received.quantity,containerStatus:'accepted'}};
  assert.equal((await send(lockedChange)).status,409);
  assert.equal((await call(path,'DELETE',await deletionReview(profile.id))).status,409);
  assert.equal((await call(path,'PATCH',{containerStatusUpdateData:{containerProfileId:profile.id,containerStatus:'rejected'}})).status,409);
  assert.equal((await call('/api/shipping-informations','DELETE',await shipmentDeletionReview(shipment.id))).status,409);
  const receivedDetail=await (await call(detailPath)).json();
  assert.equal(receivedDetail.shippingData.containerProfiles[0].correctionLocked,true);
  assert.equal(receivedDetail.permissions.canDelete,false);
  assert.equal((await send(next,supervisorSession)).status,200);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).containerStatus,'accepted');
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:profile.id}}),2);
  // Receipt history remains authoritative even if a legacy profile flag is incorrect.
  await db.containerProfile.update({where:{id:profile.id},data:{containerStatus:'pending'}});
  assert.equal((await send({...lockedChange,expected:{...lockedChange.expected,containerStatus:'pending'}})).status,409);
  const legacyDetail=await (await call(detailPath)).json();
  assert.equal(legacyDetail.shippingData.containerProfiles[0].correctionLocked,true);
  // The stepper follows the receipt record, not the outdated flag.
  assert.equal(legacyDetail.shippingData.containerProfiles[0].receiptRecorded,true);
  assert.equal(legacyDetail.journey.steps.find(step=>step.key==='receipt').state,'done');
  assert.equal(legacyDetail.permissions.canDelete,false);
  assert.equal((await db.preStorageEntry.findUniqueOrThrow({where:{id:receipt.id}})).quantity,7);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).quantity,7);
});


integration('profile preparation is reviewed, replayable and records its creator without inventing a receipt', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId:orgA.id}});
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Preparation test',driverName:'Driver',registrationPlates:'PREP',truckStatus:'IN',status:'accepted'}});
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const employeeSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  const input={quantity:3,locationOriginId:recordA.id,wasteProfileId:waste.id,shippingInformationId:shipment.id,actionKey:uuid(),expected:{truckStatus:'IN',status:'accepted',containerTypeId:waste.containerTypeId}};
  const send=(body,session=supervisorSession)=>call('/api/container-profile','POST',body,session);
  assert.equal((await send({...input,actionKey:undefined})).status,400);
  assert.equal((await send({...input,expected:undefined})).status,400);
  assert.equal((await send({...input,quantity:1.5})).status,400);
  assert.equal((await send({...input,quantity:0})).status,400);
  assert.equal((await send(input,employeeSession)).status,403);
  assert.equal((await send({...input,locationOriginId:recordB.id})).status,404);
  assert.equal((await send({...input,expected:{...input.expected,truckStatus:'OUT'},reason:'Reviewed an old shipment state'})).status,409);
  assert.equal((await send({...input,expected:{...input.expected,containerTypeId:2147483647}})).status,409);
  assert.equal(await db.containerPreparation.count({where:{shipmentId:shipment.id}}),0);
  assert.equal(await db.containerProfile.count({where:{shippingInformationId:shipment.id}}),0);
  const simultaneous=await Promise.all([send(input),send(input)]);
  assert.ok(simultaneous.some(row=>row.status===200));
  assert.ok(simultaneous.every(row=>[200,409].includes(row.status)));
  const replay=await send(input);assert.equal(replay.status,200);
  const result=await replay.json();assert.equal(result.replayed,true);
  assert.equal(result.preparation.actorId,supervisor.id);
  assert.equal(result.preparation.snapshot.quantity,3);
  assert.equal(result.preparation.fingerprint,undefined);
  assert.equal(await db.containerProfile.count({where:{shippingInformationId:shipment.id}}),1);
  assert.equal(await db.containerPreparation.count({where:{shipmentId:shipment.id}}),1);
  assert.equal((await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}})).status,'pending');
  assert.equal((await send({...input,quantity:4})).status,409);
  const detail=await (await call('/api/shipping-informations/'+shipment.id,'GET',undefined,employeeSession)).json();
  const events=detail.timeline.events.filter(row=>row.title==='Container Profile prepared');
  assert.equal(events.length,1);assert.equal(events[0].actorId,supervisor.id);
  assert.match(events[0].detail,/3 containers/);assert.match(events[0].detail,/does not confirm physical receipt/);
  assert.ok(!detail.timeline.events.some(row=>row.title==='Container Profile record created'));
  assert.equal(await db.receiptAllocation.count({where:{shipmentId:shipment.id}}),0);
  // Audit survives deletion, and retry never recreates the deleted operational profile.
  assert.equal((await call('/api/container-profile','DELETE',await deletionReview(result.preparation.containerProfileId))).status,200);
  assert.equal((await send(input)).status,200);
  assert.equal(await db.containerProfile.count({where:{shippingInformationId:shipment.id}}),0);
  assert.ok((await (await call('/api/shipping-informations/'+shipment.id)).json()).timeline.events.some(row=>row.title==='Container Profile prepared'));
  const foreignUser=await db.userProfile.create({data:{organizationId:orgB.id,email:'prep-other@test.example',password:'not-a-login-hash',companyId:1,companyName:'B',address:'B',administrator:true,role:'ADMINISTRATOR'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await send(input,foreignSession)).status,404);
  await db.shippingInformation.update({where:{id:shipment.id},data:{truckStatus:'OUT'}});
  const departed={...input,actionKey:uuid(),expected:{...input.expected,truckStatus:'OUT',status:'pending'}};
  assert.equal((await send(departed)).status,403);
  assert.equal((await send(departed,cookie)).status,400);
  const final=await send({...departed,reason:'Record omitted profile after departure'},cookie);
  assert.equal(final.status,200);
  assert.equal((await final.json()).preparation.reason,'Record omitted profile after departure');
});

integration('profile deletion preserves its audit and cannot delete a changed or received profile', async () => {
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId:orgA.id}});
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Deletion test',driverName:'Driver',registrationPlates:'DEL',truckStatus:'IN'}});
  const profile=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:shipment.id,quantity:9,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'rejected'}});
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const employeeSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  const input=await deletionReview(profile.id);
  const send=(body,session=supervisorSession)=>call('/api/container-profile','DELETE',body,session);
  assert.equal((await send({id:profile.id})).status,400);
  assert.equal((await send({...input,reason:' '})).status,400);
  assert.equal((await send(input,employeeSession)).status,403);
  assert.equal((await send({...input,expected:{...input.expected,quantity:8}})).status,409);
  assert.equal(await db.containerRemoval.count({where:{containerProfileId:profile.id}}),0);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await send(input,foreignSession)).status,404);
  // Deletion and correction race: exactly one reviewed change can commit.
  const correction={preparedData:{id:profile.id,quantity:10,locationOrigin:recordA.id,wasteProfile:waste.id,actionKey:require('node:crypto').randomUUID(),reason:'Correct the counted quantity',expected:input.expected}};
  const race=await Promise.all([send(input),call('/api/container-profile','PUT',correction,supervisorSession)]);
  assert.equal(race.filter(row=>row.status===200).length,1);
  assert.ok(race.every(row=>[200,404,409].includes(row.status)));
  const changed=await db.containerProfile.findUnique({where:{id:profile.id}});
  const confirmedInput=changed ? await deletionReview(profile.id) : input;
  if(changed) assert.equal((await send(confirmedInput)).status,200);
  const replay=await send(confirmedInput);assert.equal(replay.status,200);
  const confirmation=await replay.json();assert.equal(confirmation.replayed,true);
  assert.equal(confirmation.removal.actorId,supervisor.id);
  assert.equal(confirmation.removal.before.quantity,confirmedInput.expected.quantity);
  assert.equal(confirmation.removal.fingerprint,undefined);
  assert.equal(await db.containerProfile.findUnique({where:{id:profile.id}}),null);
  assert.equal(await db.containerRemoval.count({where:{containerProfileId:profile.id}}),1);
  assert.equal((await send({...confirmedInput,reason:'Another reason'})).status,409);
  assert.equal((await send(confirmedInput,cookie)).status,409);
  assert.equal((await send(confirmedInput,foreignSession)).status,404);
  assert.equal((await send(confirmedInput,employeeSession)).status,403);
  const detailPath='/api/shipping-informations/'+shipment.id;
  const managerDetail=await (await call(detailPath)).json();
  const removalEvent=managerDetail.timeline.events.find(row=>row.title==='Container Profile deleted');
  assert.equal(removalEvent.actorId,supervisor.id);assert.equal(removalEvent.note,'Remove a profile recorded in error');
  const employeeDetail=await (await call(detailPath,'GET',undefined,employeeSession)).json();
  assert.equal(employeeDetail.timeline.events.find(row=>row.title==='Container Profile deleted').note,null);
  assert.equal((await db.shippingInformation.findUniqueOrThrow({where:{id:shipment.id}})).status,'pending');
  // A replay remains a read of the original event even after departure.
  await db.shippingInformation.update({where:{id:shipment.id},data:{truckStatus:'OUT'}});
  assert.equal((await send(confirmedInput)).status,200);
  const outProfile=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:shipment.id,quantity:2,locationOriginId:recordA.id,wasteProfileId:waste.id}});
  const outInput=await deletionReview(outProfile.id);
  assert.equal((await send(outInput)).status,403);
  assert.equal((await send(outInput,cookie)).status,200);
  assert.equal((await send(outInput,cookie)).status,200);
  const received=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:shipment.id,quantity:2,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'accepted'}});
  assert.equal((await send(await deletionReview(received.id),cookie)).status,409);
  assert.equal(await db.containerRemoval.count({where:{containerProfileId:received.id}}),0);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:received.id}})).quantity,2);
});

integration('shipment deletion reviews all profiles and retains accessible audit history atomically', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const employeeSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  const arrival=await (await call('/api/shipping-informations','POST',{companyName:'Delete with history',driverName:'Driver',registrationPlates:'DELETE-ALL',actionKey:uuid()})).json();
  const id=arrival.arrival.shipmentId;
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId:orgA.id}});
  const profile=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:id,quantity:4,locationOriginId:recordA.id,wasteProfileId:waste.id}});
  const send=(body,session=supervisorSession)=>call('/api/shipping-informations','DELETE',body,session);
  const initial=await shipmentDeletionReview(id);
  assert.equal((await send({id})).status,400);
  assert.equal((await send({...initial,reason:''})).status,400);
  assert.equal((await send(initial,employeeSession)).status,403);
  assert.equal((await (await call('/api/shipping-informations/'+id,'GET',undefined,employeeSession)).json()).permissions.canDelete,false);
  assert.equal((await send(initial,foreignSession)).status,404);
  const second=await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:id,quantity:2,locationOriginId:recordA.id,wasteProfileId:waste.id}});
  assert.equal((await send(initial)).status,409);
  const reviewed=await shipmentDeletionReview(id);
  await db.containerProfile.update({where:{id:profile.id},data:{quantity:5}});
  assert.equal((await send(reviewed)).status,409);
  assert.equal(await db.shipmentRemoval.count({where:{shipmentId:id}}),0);
  assert.equal(await db.containerRemoval.count({where:{shipmentId:id}}),0);
  const input=await shipmentDeletionReview(id);
  const parallel=await Promise.all([send(input),send(input)]);
  assert.ok(parallel.some(row=>row.status===200));assert.ok(parallel.every(row=>[200,409].includes(row.status)));
  const replay=await send(input);assert.equal(replay.status,200);
  const result=await replay.json();assert.equal(result.replayed,true);
  assert.equal(result.removal.actorId,supervisor.id);assert.equal(result.removal.fingerprint,undefined);
  assert.deepEqual(result.removal.before.containerProfiles.map(row=>row.quantity),[5,2]);
  assert.equal(await db.shippingInformation.findUnique({where:{id}}),null);
  assert.equal(await db.containerProfile.count({where:{shippingInformationId:id}}),0);
  assert.equal(await db.shipmentRemoval.count({where:{shipmentId:id}}),1);
  const removed=await db.containerRemoval.findMany({where:{shipmentId:id}});
  assert.deepEqual(removed.map(row=>row.containerProfileId).sort((a,b)=>a-b),[profile.id,second.id].sort((a,b)=>a-b));
  assert.ok(removed.every(row=>row.before.shipmentRemovalId===result.removal.id));
  assert.equal((await send({...input,reason:'Different request'})).status,409);
  assert.equal((await send(input,cookie)).status,409);
  assert.equal((await send(input,foreignSession)).status,404);
  const history='/api/shipping-informations/deletions';
  assert.equal((await call(history,'GET',undefined,employeeSession)).status,403);
  assert.equal((await call(history+'/'+result.removal.id,'GET',undefined,employeeSession)).status,403);
  assert.equal((await call(history+'/'+result.removal.id,'GET',undefined,foreignSession)).status,404);
  const archive=await (await call(history+'/'+result.removal.id,'GET',undefined,supervisorSession)).json();
  assert.equal(archive.removal.before.registrationPlates,'DELETE-ALL');
  assert.ok(archive.timeline.events.some(row=>row.title==='Arrival recorded'));
  assert.ok(archive.timeline.events.some(row=>row.title==='Shipment deleted'));
  assert.equal(archive.timeline.events.filter(row=>row.title==='Container Profile deleted').length,2);
  // Employee still may remove an empty IN entry; receipt/transfer safeguards remain.
  const empty=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Empty',driverName:'D',registrationPlates:'EMPTY',truckStatus:'IN'}});
  const emptyInput=await shipmentDeletionReview(empty.id);
  assert.equal((await send(emptyInput,employeeSession)).status,200);
  assert.equal((await send(emptyInput,employeeSession)).status,200);
  const locked=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Locked',driverName:'D',registrationPlates:'LOCK',truckStatus:'IN'}});
  await db.containerProfile.create({data:{organizationId:orgA.id,shippingInformationId:locked.id,quantity:2,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'accepted'}});
  assert.equal((await send(await shipmentDeletionReview(locked.id),cookie)).status,409);
  assert.equal(await db.shipmentRemoval.count({where:{shipmentId:locked.id}}),0);
  assert.equal(await db.containerRemoval.count({where:{shipmentId:locked.id}}),0);
  assert.ok(await db.shippingInformation.findUnique({where:{id:locked.id}}));
  // Paginated retained history is organization-scoped and never exceeds ten records.
  for(let i=0;i<11;i++) await db.shipmentRemoval.create({data:{organizationId:orgA.id,shipmentId:100000+i,actorId:admin.id,actionKey:uuid(),fingerprint:'isolated-pagination-fixture',reason:'Test pagination',before:{...result.removal.before,id:100000+i}}});
  const page=await (await call(history)).json();assert.equal(page.removals.length,10);
  const last=await (await call(history+'?page=999')).json();assert.equal(last.page,last.pages);assert.ok(last.removals.length<=10);
  assert.equal((await (await call(history,'GET',undefined,foreignSession)).json()).total,0);
});

integration('definition deletion cannot cascade into shipment profiles and is restricted by database foreign keys', async () => {
  const organizationId = orgA.id;
  const origin = await db.locationOrigin.create({data:{organizationId,name:'Protected origin',address:'Demo',origin:'Demo'}});
  const type = await db.containerType.create({data:{organizationId,name:'Protected type',material:'steel',volume:1,carryingCapacity:1,radioactivityLevel:'demo',physicalProperties:'demo',footprint:1,description:'demo'}});
  const waste = await db.wasteProfile.create({data:{organizationId,name:'Protected waste',typeOfWaste:'demo',wasteDescription:'demo',risksAndHazards:'demo',processingMethods:'demo',physicalProperties:'demo',chemicalProperties:'demo',biologicalProperties:'demo',collectionProcedures:'demo',containerTypeId:type.id}});
  const shipment = await db.shippingInformation.create({data:{organizationId,companyName:'Protected shipment',driverName:'Demo',registrationPlates:'PROTECTED'}});
  const profile = await db.containerProfile.create({data:{organizationId,shippingInformationId:shipment.id,locationOriginId:origin.id,wasteProfileId:waste.id,quantity:7}});
  const entries = [['location-origin','locationOrigin',origin.id],['waste-profile','wasteProfile',waste.id],['container-type','containerType',type.id]];
  for (const truckStatus of ['IN','OUT']) {
    await db.shippingInformation.update({where:{id:shipment.id},data:{truckStatus}});
    for (const containerStatus of ['pending','accepted','rejected']) {
      await db.containerProfile.update({where:{id:profile.id},data:{containerStatus}});
      for (const [path,,id] of entries) {
        const response = await call('/api/container-profile/'+path,'DELETE',await definitionReview(path,id));
        assert.equal(response.status,409);
        assert.match((await response.json()).message,/used by/);
      }
      assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).quantity,7);
    }
  }
  // Direct DB writes and racing inserts are also subject to non-cascading foreign keys.
  for (const [,model,id] of entries) {
    await assert.rejects(db[model].delete({where:{id}}),{code:'P2003'});
    assert.ok(await db[model].findUnique({where:{id}}));
  }
  const origins = await (await call('/api/container-profile/location-origin')).json();
  assert.equal(origins.locationOriginData.find(row=>row.id===origin.id).usage.containerProfiles,1);
  const wastes = await (await call('/api/container-profile/waste-profile')).json();
  assert.equal(wastes.wasteProfileData.find(row=>row.id===waste.id).usage.containerProfiles,1);
  const types = await (await call('/api/container-profile/container-type')).json();
  assert.equal(types.containerTypeData.find(row=>row.id===type.id).usage.wasteProfile.id,waste.id);
  const employeeSession = 'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  for (const [path,,id] of entries) assert.equal((await call('/api/container-profile/'+path,'DELETE',await definitionReview(path,id),employeeSession)).status,403);
  assert.equal((await call('/api/container-profile/location-origin','DELETE',await definitionReview('location-origin',recordB.id))).status,404);
  // Definitions without dependants remain removable; an unused Waste Profile still protects its type.
  const freeOrigin = await db.locationOrigin.create({data:{organizationId,name:'Unused',address:'Demo',origin:'Demo'}});
  const {id: _oldTypeId, ...typeData} = type;
  const freeType = await db.containerType.create({data:{...typeData,name:'Unused type'}});
  const {id: _oldWasteId, ...wasteData} = waste;
  const freeWaste = await db.wasteProfile.create({data:{...wasteData,name:'Unused waste',containerTypeId:freeType.id}});
  assert.equal((await call('/api/container-profile/container-type','DELETE',await definitionReview('container-type',freeType.id))).status,409);
  for (const [path,id] of [['location-origin',freeOrigin.id],['waste-profile',freeWaste.id],['container-type',freeType.id]]) {
    assert.equal((await call('/api/container-profile/'+path,'DELETE',await definitionReview(path,id))).status,200);
  }
  assert.ok(await db.containerProfile.findUnique({where:{id:profile.id}}));
  assert.ok(await db.shippingInformation.findUnique({where:{id:shipment.id}}));
});

integration('definition changes are reviewed, recorded atomically and locked once profiles or their history rely on them', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const path='/api/container-profile/location-origin';
  const values={name:'Audited origin',address:'Demo address',origin:'Demo origin'};
  // Creation requires a confirmation key; the same attempt is replayed, never duplicated.
  assert.equal((await call(path,'POST',{values})).status,400);
  assert.equal((await call(path,'POST',{values:{...values,name:' '},actionKey:uuid()})).status,400);
  const create={values,actionKey:uuid(),reason:''};
  const created=await call(path,'POST',create);
  assert.equal(created.status,200);
  const { change:first }=await created.json();
  assert.equal(first.action,'CREATE');assert.equal(first.actorId,admin.id);assert.equal(first.after.name,'Audited origin');assert.equal(first.before,null);
  assert.equal(first.fingerprint,undefined);assert.equal(first.actionKey,undefined);
  const replay=await (await call(path,'POST',create)).json();
  assert.equal(replay.replayed,true);assert.equal(replay.change.id,first.id);
  assert.equal(await db.locationOrigin.count({where:{name:'Audited origin'}}),1);
  assert.equal((await call(path,'POST',{...create,values:{...values,name:'Other'}})).status,409);
  const id=first.definitionId;
  // Edits of unused definitions need a reason and the reviewed version.
  const review=await definitionReview('location-origin',id);
  assert.equal((await definitionRow('location-origin',id)).locked,false);
  assert.equal((await call(path,'PUT',{...review,values,reason:'no'})).status,400);
  assert.equal((await call(path,'PUT',{...review,values})).status,400);
  const racing=await Promise.all([
    call(path,'PUT',{...review,values:{...values,address:'Corrected address'}}),
    call(path,'PUT',{...review,actionKey:uuid(),values:{...values,address:'Competing address'}}),
  ]);
  assert.deepEqual(racing.map(row=>row.status).sort(),[200,409]);
  const saved=await db.locationOrigin.findUniqueOrThrow({where:{id}});
  assert.equal((await call(path,'PUT',{...review,actionKey:uuid(),values:{...values,address:'Stale review'}})).status,409);
  assert.equal((await db.locationOrigin.findUniqueOrThrow({where:{id}})).address,saved.address);
  const edit=await db.definitionChange.findFirstOrThrow({where:{definitionId:id,action:'UPDATE'}});
  assert.equal(edit.before.address,'Demo address');assert.equal(edit.after.address,saved.address);assert.equal(edit.reason,'Administrative definition review');
  // Once a Container Profile uses the origin, its values can no longer be rewritten or deleted.
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId:orgA.id,archivedAt:null}});
  const shipment=await db.shippingInformation.create({data:{organizationId:orgA.id,companyName:'Definition lock',driverName:'Driver',registrationPlates:'DEF'}});
  const prepare=(locationOriginId,extra={})=>call('/api/container-profile','POST',{quantity:2,shippingInformationId:shipment.id,locationOriginId,wasteProfileId:waste.id,actionKey:uuid(),expected:{truckStatus:'IN',status:shipment.status,containerTypeId:waste.containerTypeId},...extra});
  const prepared=await (await prepare(id)).json();
  const locked=await definitionRow('location-origin',id);
  assert.equal(locked.locked,true);assert.match(locked.lockReason,/Used by 1 Container Profile/);
  const lockedUpdate=await call(path,'PUT',{...await definitionReview('location-origin',id),values:{...values,name:'Rewritten meaning'}});
  assert.equal(lockedUpdate.status,409);assert.match((await lockedUpdate.json()).message,/cannot be rewritten/);
  assert.equal((await call(path,'DELETE',await definitionReview('location-origin',id))).status,409);
  assert.equal((await db.locationOrigin.findUniqueOrThrow({where:{id}})).name,'Audited origin');
  // Recorded history keeps the lock after the operational profile is deleted.
  const historyOnly=await db.locationOrigin.create({data:{organizationId:orgA.id,name:'History only',address:'Demo',origin:'Demo'}});
  const other=await (await prepare(historyOnly.id)).json();
  assert.equal((await call('/api/container-profile','DELETE',await deletionReview(other.preparation.containerProfileId))).status,200);
  const historyRow=await definitionRow('location-origin',historyOnly.id);
  assert.equal(historyRow.usage.containerProfiles,0);assert.equal(historyRow.locked,true);assert.match(historyRow.lockReason,/recorded Container Profile event/);
  assert.equal((await call(path,'DELETE',await definitionReview('location-origin',historyOnly.id))).status,409);
  // Archiving keeps existing profiles unchanged and stops new use of the definition.
  const archive=await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'ARCHIVE'});
  assert.equal(archive.status,200);
  assert.ok((await db.locationOrigin.findUniqueOrThrow({where:{id}})).archivedAt);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:prepared.preparation.containerProfileId}})).locationOriginId,id);
  assert.equal((await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'ARCHIVE'})).status,409);
  assert.equal((await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'REWRITE'})).status,400);
  const blocked=await prepare(id);
  assert.equal(blocked.status,409);assert.match((await blocked.json()).message,/archived/);
  const profile=await db.containerProfile.findUniqueOrThrow({where:{id:prepared.preparation.containerProfileId}});
  const expected={quantity:profile.quantity,locationOriginId:id,wasteProfileId:waste.id,containerStatus:profile.containerStatus,truckStatus:'IN'};
  const correct=(locationOrigin)=>call('/api/container-profile','PUT',{preparedData:{id:profile.id,quantity:3,locationOrigin,wasteProfile:waste.id,actionKey:uuid(),reason:'Correct the counted quantity',expected}});
  assert.equal((await correct(id)).status,200);
  const archivedOther=await db.locationOrigin.create({data:{organizationId:orgA.id,name:'Archived other',address:'Demo',origin:'Demo',archivedAt:new Date()}});
  expected.quantity=3;
  assert.equal((await correct(archivedOther.id)).status,409);
  const restore=await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'RESTORE'});
  assert.equal(restore.status,200);
  assert.equal((await db.locationOrigin.findUniqueOrThrow({where:{id}})).archivedAt,null);
  // A Container Type is archived only after its Waste Profile, and restored first.
  const typeData={organizationId:orgA.id,material:'Demo',volume:1.5,carryingCapacity:2,footprint:1.25,radioactivityLevel:'Demo',physicalProperties:'Demo',description:'Demo'};
  const type=await db.containerType.create({data:{...typeData,name:'Archive order type'}});
  const wasteValues={name:'Archive order waste',typeOfWaste:'demo',wasteDescription:'demo',risksAndHazards:'demo',processingMethods:'demo',physicalProperties:'demo',chemicalProperties:'demo',biologicalProperties:'demo',collectionProcedures:'demo',containerTypeId:type.id};
  const wasteId=(await (await call('/api/container-profile/waste-profile','POST',{values:wasteValues,actionKey:uuid()})).json()).change.definitionId;
  const patch=async(resource,rowId,action)=>call('/api/container-profile/'+resource,'PATCH',{...await definitionReview(resource,rowId),action});
  assert.equal((await patch('container-type',type.id,'ARCHIVE')).status,409);
  assert.equal((await patch('waste-profile',wasteId,'ARCHIVE')).status,200);
  assert.equal((await patch('container-type',type.id,'ARCHIVE')).status,200);
  assert.equal((await patch('waste-profile',wasteId,'RESTORE')).status,409);
  const spare=await db.containerType.create({data:{...typeData,name:'Archived spare',archivedAt:new Date()}});
  assert.equal((await call('/api/container-profile/waste-profile','POST',{values:{...wasteValues,name:'Uses archived type',containerTypeId:spare.id},actionKey:uuid()})).status,409);
  assert.equal((await patch('container-type',type.id,'RESTORE')).status,200);
  assert.equal((await patch('waste-profile',wasteId,'RESTORE')).status,200);
  const typeEdit=await call('/api/container-profile/container-type','PUT',{...await definitionReview('container-type',type.id),values:{...typeData,organizationId:undefined,name:'Archive order type',volume:2.75}});
  assert.equal(typeEdit.status,200);
  assert.equal((await db.containerType.findUniqueOrThrow({where:{id:type.id}})).volume,2.75);
  // Deletion of an unused definition keeps a replayable record after the row is gone.
  const unused=await db.locationOrigin.create({data:{organizationId:orgA.id,name:'Deleted unused',address:'Demo',origin:'Demo'}});
  const removal=await definitionReview('location-origin',unused.id,{reason:'Created by mistake'});
  const removed=await (await call(path,'DELETE',removal)).json();
  assert.equal(removed.change.action,'DELETE');assert.equal(removed.change.before.name,'Deleted unused');assert.equal(removed.change.after,null);
  assert.equal(await db.locationOrigin.count({where:{id:unused.id}}),0);
  assert.equal((await (await call(path,'DELETE',removal)).json()).change.id,removed.change.id);
  assert.equal((await call(path,'DELETE',{...removal,reason:'Different reason'})).status,409);
  // History is administrator-only, newest first, paginated and organization-scoped.
  const history=await (await call('/api/container-profile/definition-changes?type=LOCATION_ORIGIN&definitionId='+id)).json();
  assert.deepEqual(history.changes.map(row=>row.action),['RESTORE','ARCHIVE','UPDATE','CREATE']);
  assert.equal(history.changes[0].fingerprint,undefined);
  assert.equal((await call('/api/container-profile/definition-changes?type=UNKNOWN')).status,400);
  const all=await (await call('/api/container-profile/definition-changes?page=999')).json();
  assert.equal(all.page,all.pages);assert.ok(all.changes.length<=10);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await (await call('/api/container-profile/definition-changes','GET',undefined,foreignSession)).json()).total,0);
  assert.equal((await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'ARCHIVE'},foreignSession)).status,404);
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  assert.equal((await call('/api/container-profile/definition-changes','GET',undefined,supervisorSession)).status,403);
  assert.equal((await call(path,'PATCH',{...await definitionReview('location-origin',id),action:'ARCHIVE'},supervisorSession)).status,403);
});

integration('halls and responsible persons keep their receipts, measurements and transfers and record changes without personal values', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const organizationId=orgA.id;
  const prePath='/api/pre-storage-setup/pre-storage-location', employeePath='/api/pre-storage-setup/pre-storage-employee';
  const hallValues={name:'Audited hall',surfaceArea:100,containerFootprint:2,containerType:'Audit type',wasteProfile:'Audit waste',preStorageFor:'Audit'};
  assert.equal((await call(prePath,'POST',{values:{...hallValues,surfaceArea:1.5},actionKey:uuid()})).status,400);
  const hallCreate={values:hallValues,actionKey:uuid()};
  const hallChange=(await (await call(prePath,'POST',hallCreate)).json()).change;
  assert.equal(hallChange.action,'CREATE');assert.equal(hallChange.after.surfaceArea,100);
  assert.equal((await (await call(prePath,'POST',hallCreate)).json()).change.id,hallChange.id);
  const hallId=hallChange.definitionId;
  // Personal values are validated and saved, but not copied into the change history.
  const personValues={name:'Audit',surname:'Person',dateOfBirth:'1980-05-01',address:'Private street 1',qualifications:'Radiation protection',safetyTraining:true};
  assert.equal((await call(employeePath,'POST',{values:{...personValues,dateOfBirth:'2026-02-31'},actionKey:uuid()})).status,400);
  assert.equal((await call(employeePath,'POST',{values:{...personValues,safetyTraining:'yes'},actionKey:uuid()})).status,400);
  const personChange=(await (await call(employeePath,'POST',{values:personValues,actionKey:uuid()})).json()).change;
  const personId=personChange.definitionId;
  assert.equal(personChange.after.name,'Audit');assert.equal(personChange.after.address,undefined);assert.equal(personChange.after.dateOfBirth,undefined);
  const person=await db.preStorageResponsibleEmployee.findUniqueOrThrow({where:{id:personId}});
  assert.equal(person.address,'Private street 1');assert.equal(person.dateOfBirth.toISOString().slice(0,10),'1980-05-01');
  // Operational records make the hall and person non-deletable, including direct DB deletes.
  await db.preStorageEntry.create({data:{organizationId,quantity:3,preStorageLocationId:hallId,responsiblePreStorageEmployeeId:personId}});
  await db.preStorageConditions.create({data:{organizationId,preStorageTemperature:20,preStorageRadiationLevel:0,preStorageHumidity:40,preStoragePressure:1000,preStorageLocationId:hallId,preStorageResponsibleEmployeeId:personId}});
  const hallRow=await (await call(prePath)).json().then(data=>data.preStorageLocationData.find(row=>row.id===hallId));
  assert.equal(hallRow.locked,true);assert.match(hallRow.lockReason,/1 receipt, 1 measurement/);assert.ok(Array.isArray(hallRow.preStorageEntry));
  const hallReview=async(extra={})=>({id:hallId,expectedVersion:(await (await call(prePath)).json()).preStorageLocationData.find(row=>row.id===hallId).version,reason:'Administrative storage review',actionKey:uuid(),...extra});
  const blocked=await call(prePath,'DELETE',await hallReview());
  assert.equal(blocked.status,409);assert.match((await blocked.json()).message,/used by existing records/);
  const personReview=async(path,listKey,id,extra={})=>({id,expectedVersion:(await (await call(path)).json())[listKey].find(row=>row.id===id).version,reason:'Administrative storage review',actionKey:uuid(),...extra});
  assert.equal((await call(employeePath,'DELETE',await personReview(employeePath,'preStorageEmployeeData',personId))).status,409);
  await assert.rejects(db.preStorageLocation.delete({where:{id:hallId}}),{code:'P2003'});
  await assert.rejects(db.preStorageResponsibleEmployee.delete({where:{id:personId}}),{code:'P2003'});
  assert.equal(await db.preStorageEntry.count({where:{preStorageLocationId:hallId}}),1);
  assert.equal(await db.preStorageConditions.count({where:{preStorageLocationId:hallId}}),1);
  // Corrections of used entries remain possible and are recorded with before/after values.
  const rename=await call(prePath,'PUT',{...await hallReview(),values:{...hallValues,name:'Audited hall A'}});
  assert.equal(rename.status,200);
  const renamed=(await rename.json()).change;
  assert.equal(renamed.before.name,'Audited hall');assert.equal(renamed.after.name,'Audited hall A');assert.deepEqual(renamed.after.changedFields,['name']);
  assert.equal((await call(prePath,'PUT',{...await hallReview(),values:{...hallValues,name:'Audited hall A'}})).status,400);
  const moved=await call(employeePath,'PUT',{...await personReview(employeePath,'preStorageEmployeeData',personId),values:{...personValues,address:'Private street 2',qualifications:'Updated qualification'}});
  assert.equal(moved.status,200);
  const movedChange=(await moved.json()).change;
  assert.deepEqual(movedChange.after.changedFields,['address','qualifications']);
  assert.equal(movedChange.before.address,undefined);assert.equal(movedChange.after.qualifications,'Updated qualification');
  assert.equal((await db.preStorageResponsibleEmployee.findUniqueOrThrow({where:{id:personId}})).address,'Private street 2');
  const history=await (await call('/api/container-profile/definition-changes?type=PRE_STORAGE_EMPLOYEE&definitionId='+personId)).json();
  assert.deepEqual(history.changes.map(row=>row.action),['UPDATE','CREATE']);
  assert.doesNotMatch(JSON.stringify(history),/Private street|1980-05-01/);
  // Final halls with legacy stored quantity, transfers or measurements are protected as well.
  const finalPath='/api/final-storage-setup/final-storage-location', finalEmployeePath='/api/final-storage-setup/final-storage-employee';
  const stocked=await db.finalStorageLocation.create({data:{organizationId,name:'Legacy stock hall',containerType:'Audit type',containerFootprint:2,surfaceArea:50,depth:3,quantity:5}});
  const stockedRow=(await (await call(finalPath)).json()).finalStorageLocationData.find(row=>row.id===stocked.id);
  assert.match(stockedRow.lockReason,/5 recorded stored containers/);
  assert.equal((await call(finalPath,'DELETE',await personReview(finalPath,'finalStorageLocationData',stocked.id))).status,409);
  const finalPerson=await db.finalStorageResponsibleEmployee.create({data:{organizationId,name:'Final',surname:'Person',dateOfBirth:new Date('1985-01-01'),qualifications:'Demo',address:'Demo',safetyTraining:true}});
  const empty=await db.finalStorageLocation.create({data:{organizationId,name:'Empty final hall',containerType:'Audit type',containerFootprint:2,surfaceArea:50,depth:3}});
  await db.storageTransferRequest.create({data:{organizationId,requestedQuantity:1,requestedByRoom:'Legacy stock hall',requestedByEmployeeId:finalPerson.id,finalStorageLocationId:stocked.id}});
  await db.finalStorageCondition.create({data:{organizationId,finalStorageTemperature:20,finalStorageRadiationLevel:0,finalStorageHumidity:40,finalStoragePressure:1000,finalStorageLocationId:stocked.id,finalStorageResponsibleEmployeeId:finalPerson.id}});
  assert.equal((await call(finalEmployeePath,'DELETE',await personReview(finalEmployeePath,'finalStorageEmployeeData',finalPerson.id))).status,409);
  await assert.rejects(db.finalStorageResponsibleEmployee.delete({where:{id:finalPerson.id}}),{code:'P2003'});
  await assert.rejects(db.finalStorageLocation.delete({where:{id:stocked.id}}),{code:'P2003'});
  assert.equal((await db.finalStorageCondition.findFirstOrThrow({where:{finalStorageLocationId:stocked.id}})).finalStorageResponsibleEmployeeId,finalPerson.id);
  // An unused hall can be deleted after review; the confirmation stays replayable.
  const removal=await personReview(finalPath,'finalStorageLocationData',empty.id);
  const removed=await call(finalPath,'DELETE',removal);
  assert.equal(removed.status,200);
  assert.equal((await (await call(finalPath,'DELETE',removal)).json()).replayed,true);
  assert.equal(await db.finalStorageLocation.count({where:{id:empty.id}}),0);
  // Only current administrators change storage configuration.
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  assert.equal((await call(prePath,'POST',{values:hallValues,actionKey:uuid()},supervisorSession)).status,403);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await call(prePath,'PUT',{...await hallReview(),values:hallValues},foreignSession)).status,404);
});

integration('a responsible person who left is deactivated for new records while their history stays linked', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const organizationId=orgA.id;
  const path='/api/pre-storage-setup/pre-storage-employee', finalPath='/api/final-storage-setup/final-storage-employee';
  const person=await db.preStorageResponsibleEmployee.create({data:{organizationId,name:'Leaving',surname:'Person',dateOfBirth:new Date('1979-03-04'),address:'Private',qualifications:'Demo',safetyTraining:true}});
  const hall=await db.preStorageLocation.create({data:{organizationId,name:'Deactivation hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const measure=(employeeId,submissionKey=uuid())=>call('/api/pre-storage-setup/pre-storage-conditions','POST',{submissionKey,preStorageTemperature:20,preStorageRadiationLevel:0,preStorageHumidity:40,preStoragePressure:1000,preStorageLocationId:hall.id,preStorageResponsibleEmployeeId:employeeId});
  const earlierKey=uuid();
  assert.equal((await measure(person.id,earlierKey)).status,200);
  const review=async(listPath,listKey,id,extra={})=>({id,expectedVersion:(await (await call(listPath)).json())[listKey].find(row=>row.id===id).version,reason:'Person left the organization',actionKey:uuid(),...extra});
  // Deactivation is reviewed and recorded; the person and their history remain.
  const deactivation=await review(path,'preStorageEmployeeData',person.id,{action:'ARCHIVE'});
  const deactivated=await call(path,'PATCH',deactivation);
  assert.equal(deactivated.status,200);
  assert.equal((await deactivated.json()).change.action,'ARCHIVE');
  assert.equal((await (await call(path,'PATCH',deactivation)).json()).replayed,true);
  assert.ok((await db.preStorageResponsibleEmployee.findUniqueOrThrow({where:{id:person.id}})).archivedAt);
  const row=(await (await call(path)).json()).preStorageEmployeeData.find(item=>item.id===person.id);
  assert.ok(row.archivedAt);assert.equal(row.locked,true);
  assert.equal((await call(path,'PATCH',await review(path,'preStorageEmployeeData',person.id,{action:'ARCHIVE'}))).status,409);
  // New records naming the inactive person are refused; a confirmed earlier record replays.
  const refused=await measure(person.id);
  assert.equal(refused.status,409);assert.match((await refused.json()).message,/deactivated/);
  assert.equal(await db.preStorageConditions.count({where:{preStorageResponsibleEmployeeId:person.id}}),1);
  assert.equal((await (await measure(person.id,earlierKey)).json()).replayed,true);
  // Corrections remain possible, deletion stays blocked, and the history is kept.
  const values={name:'Leaving',surname:'Person',dateOfBirth:'1979-03-04',address:'Private',qualifications:'Corrected qualification',safetyTraining:true};
  assert.equal((await call(path,'PUT',{...await review(path,'preStorageEmployeeData',person.id),values})).status,200);
  assert.equal((await call(path,'DELETE',await review(path,'preStorageEmployeeData',person.id))).status,409);
  const history=await (await call('/api/container-profile/definition-changes?type=PRE_STORAGE_EMPLOYEE&definitionId='+person.id)).json();
  assert.deepEqual(history.changes.map(item=>item.action),['UPDATE','ARCHIVE']);
  // Final-storage people are handled the same way for new transfer requests.
  const finalPerson=await db.finalStorageResponsibleEmployee.create({data:{organizationId,name:'Final',surname:'Leaver',dateOfBirth:new Date('1980-01-01'),qualifications:'Demo',address:'Private',safetyTraining:true}});
  const room=await db.finalStorageLocation.create({data:{organizationId,name:'Deactivation room',containerType:'Demo',containerFootprint:1,surfaceArea:50,depth:2}});
  assert.equal((await call(finalPath,'PATCH',await review(finalPath,'finalStorageEmployeeData',finalPerson.id,{action:'ARCHIVE'}))).status,200);
  const request=await call('/api/final-storage-setup/final-storage-transver-request','POST',{requestedQuantity:1,requestedByRoom:room.name,requestedByEmployeeId:finalPerson.id,finalStorageLocationId:room.id,actionKey:uuid()});
  assert.equal(request.status,409);
  assert.equal(await db.storageTransferRequest.count({where:{requestedByEmployeeId:finalPerson.id}}),0);
  // Reactivation restores selection for new records.
  assert.equal((await call(path,'PATCH',await review(path,'preStorageEmployeeData',person.id,{action:'RESTORE'}))).status,200);
  assert.equal((await measure(person.id)).status,200);
  // Halls have no deactivation action.
  assert.equal((await call('/api/pre-storage-setup/pre-storage-location','PATCH',{id:hall.id,action:'ARCHIVE'})).status,405);
});

integration('stock reconciliation discloses legacy records and records verifications without changing stock', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const organizationId=orgA.id;
  const hall=await db.preStorageLocation.create({data:{organizationId,name:'Reconciliation hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Recon type',wasteProfile:'Recon waste'}});
  const person=await db.preStorageResponsibleEmployee.create({data:{organizationId,name:'Recon',surname:'Person',dateOfBirth:new Date('1980-01-01'),address:'Demo',qualifications:'Demo',safetyTraining:true}});
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId,archivedAt:null}});
  const shipment=await db.shippingInformation.create({data:{organizationId,companyName:'Recon',driverName:'Driver',registrationPlates:'RECON'}});
  const linkedProfile=await db.containerProfile.create({data:{organizationId,shippingInformationId:shipment.id,locationOriginId:recordA.id,wasteProfileId:waste.id,quantity:3,containerStatus:'accepted'}});
  const legacyProfile=await db.containerProfile.create({data:{organizationId,shippingInformationId:shipment.id,locationOriginId:recordA.id,wasteProfileId:waste.id,quantity:4,containerStatus:'accepted'}});
  const legacyReceipt=await db.preStorageEntry.create({data:{organizationId,quantity:4,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:person.id}});
  const linkedReceipt=await db.preStorageEntry.create({data:{organizationId,quantity:3,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:person.id}});
  await db.receiptAllocation.create({data:{organizationId,receiptId:linkedReceipt.id,shipmentId:shipment.id,containerProfileId:linkedProfile.id,locationId:hall.id,quantity:3,actorId:admin.id,responsibleEmployeeId:person.id}});
  const finalPerson=await db.finalStorageResponsibleEmployee.create({data:{organizationId,name:'Recon',surname:'Final',dateOfBirth:new Date('1980-01-01'),qualifications:'Demo',address:'Demo',safetyTraining:true}});
  const room=await db.finalStorageLocation.create({data:{organizationId,name:'Reconciliation room',containerType:'Recon type',containerFootprint:1,surfaceArea:50,depth:2,quantity:5}});
  const legacyTransfer=await db.storageTransferRequest.create({data:{organizationId,requestedQuantity:2,requestedByRoom:room.name,requestedByEmployeeId:finalPerson.id,finalStorageLocationId:room.id,preStorageStatus:'completed',finalStorageStatus:'accepted'}});
  const overview=async(session=cookie)=>call('/api/storage-reconciliation','GET',undefined,session);
  let data=await (await overview()).json();
  let pre=data.pre.find(row=>row.id===hall.id), final=data.final.find(row=>row.id===room.id);
  assert.equal(pre.figures.recordedQuantity,7);assert.equal(pre.figures.unlinkedQuantity,4);assert.equal(pre.unlinkedReceiptCount,1);
  assert.equal(pre.unlinkedReceipts[0].id,legacyReceipt.id);assert.match(pre.findings[0],/cannot be selected as a transfer source/);
  assert.equal(pre.lastVerification,null);
  // Unlinked accepted transfers are disclosed, not added to the stored quantity.
  assert.equal(final.figures.recordedQuantity,5);assert.equal(final.unlinkedTransferCount,1);assert.equal(final.unlinkedTransfers[0].id,legacyTransfer.id);
  assert.ok(data.unlinkedAcceptedProfiles.some(row=>row.id===legacyProfile.id));
  assert.ok(!data.unlinkedAcceptedProfiles.some(row=>row.id===linkedProfile.id));
  // A verification is validated, compared with the reviewed figures and replayable.
  const path='/api/storage-reconciliation/verifications';
  const input={area:'PRE_STORAGE',locationId:hall.id,countedQuantity:6,expectedVersion:pre.version,reason:'Physical count by shift lead, list 2026-09-24',actionKey:uuid()};
  assert.equal((await call(path,'POST',{...input,countedQuantity:-1})).status,400);
  assert.equal((await call(path,'POST',{...input,reason:'x'})).status,400);
  assert.equal((await call(path,'POST',{...input,expectedVersion:'0'.repeat(64)})).status,409);
  const saved=await call(path,'POST',input);
  assert.equal(saved.status,200);
  const verification=(await saved.json()).verification;
  assert.equal(verification.countedQuantity,6);assert.equal(verification.recordedQuantity,7);assert.equal(verification.recorded.unlinkedQuantity,4);assert.equal(verification.actorId,admin.id);
  assert.equal((await (await call(path,'POST',input)).json()).replayed,true);
  assert.equal((await call(path,'POST',{...input,countedQuantity:7})).status,409);
  // Recorded stock, receipts and links are unchanged by a verification.
  assert.equal(await db.preStorageEntry.count({where:{preStorageLocationId:hall.id}}),2);
  assert.equal(await db.receiptAllocation.count({where:{locationId:hall.id}}),1);
  data=await (await overview()).json();
  pre=data.pre.find(row=>row.id===hall.id);
  assert.equal(pre.figures.recordedQuantity,7);assert.equal(pre.lastVerification.id,verification.id);
  // Zero is a valid count; a changed recorded state makes an older review stale.
  final=data.final.find(row=>row.id===room.id);
  assert.equal((await call(path,'POST',{area:'FINAL_STORAGE',locationId:room.id,countedQuantity:0,expectedVersion:final.version,reason:'Hall found empty during inspection',actionKey:uuid()})).status,200);
  assert.equal((await db.finalStorageLocation.findUniqueOrThrow({where:{id:room.id}})).quantity,5);
  await db.preStorageEntry.create({data:{organizationId,quantity:1,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:person.id}});
  assert.equal((await call(path,'POST',{...input,actionKey:uuid()})).status,409);
  const list=await (await call(path+'?area=PRE_STORAGE&locationId='+hall.id)).json();
  assert.equal(list.total,1);assert.equal(list.verifications[0].id,verification.id);
  assert.equal((await call(path+'?area=OTHER&locationId=1')).status,400);
  // Managers only; organizations stay isolated.
  const employeeSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(member.id)}});
  assert.equal((await overview(employeeSession)).status,403);
  assert.equal((await call(path,'POST',{...input,actionKey:uuid()},employeeSession)).status,403);
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const fresh=(await (await overview(supervisorSession)).json()).pre.find(row=>row.id===hall.id);
  assert.equal((await call(path,'POST',{...input,expectedVersion:fresh.version,countedQuantity:8,actionKey:uuid()},supervisorSession)).status,200);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await call(path,'POST',{...input,actionKey:uuid()},foreignSession)).status,404);
  assert.equal((await (await call(path,'GET',undefined,foreignSession)).json()).total,0);
  assert.ok(!(await (await overview(foreignSession)).json()).pre.some(row=>row.id===hall.id));
});

integration('administrators link earlier receipts with a document reference and approve stock corrections to a recorded count', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const organizationId=orgA.id;
  const hall=await db.preStorageLocation.create({data:{organizationId,name:'Legacy link hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Link type',wasteProfile:'Link waste'}});
  const person=await db.preStorageResponsibleEmployee.create({data:{organizationId,name:'Link',surname:'Person',dateOfBirth:new Date('1980-01-01'),address:'Demo',qualifications:'Demo',safetyTraining:true}});
  const waste=await db.wasteProfile.findFirstOrThrow({where:{organizationId,archivedAt:null}});
  const shipment=await db.shippingInformation.create({data:{organizationId,companyName:'Legacy link',driverName:'Driver',registrationPlates:'LINK'}});
  const profile=(quantity,containerStatus='accepted')=>db.containerProfile.create({data:{organizationId,shippingInformationId:shipment.id,locationOriginId:recordA.id,wasteProfileId:waste.id,quantity,containerStatus}});
  const [two,three,pending]=[await profile(2),await profile(3),await profile(5,'pending')];
  const receipt=await db.preStorageEntry.create({data:{organizationId,quantity:5,preStorageLocationId:hall.id,createdAt:new Date('2024-03-01T08:00:00Z')}});
  await db.preStorageEntry.create({data:{organizationId,quantity:4,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:person.id}});
  const overview=async()=> (await (await call('/api/storage-reconciliation')).json()).pre.find(row=>row.id===hall.id);
  let row=await overview();
  const version=row.unlinkedReceipts.find(item=>item.id===receipt.id).version;
  const path='/api/storage-reconciliation/legacy-links';
  const candidates=await (await call(path)).json();
  assert.ok(candidates.candidates.some(item=>item.id===two.id));assert.ok(!candidates.candidates.some(item=>item.id===pending.id));
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(supervisor.id)}});
  const input={receiptId:receipt.id,containerProfileIds:[three.id,two.id],expectedVersion:version,reason:'Delivery note DN-2024-031',actionKey:uuid()};
  assert.equal((await call(path,'POST',input,supervisorSession)).status,403);
  assert.equal((await call(path,'POST',{...input,reason:''})).status,400);
  const partial=await call(path,'POST',{...input,containerProfileIds:[two.id],actionKey:uuid()});
  assert.equal(partial.status,409);assert.match((await partial.json()).message,/complete matches/);
  assert.equal((await call(path,'POST',{...input,containerProfileIds:[two.id,pending.id],actionKey:uuid()})).status,409);
  assert.equal((await call(path,'POST',{...input,expectedVersion:'0'.repeat(64),actionKey:uuid()})).status,409);
  const linked=await call(path,'POST',input);
  assert.equal(linked.status,200);
  const link=(await linked.json()).link;
  assert.equal(link.receiptQuantity,5);assert.equal(new Date(link.receiptCreatedAt).toISOString(),'2024-03-01T08:00:00.000Z');assert.equal(link.profiles.length,2);
  const allocations=await db.receiptAllocation.findMany({where:{receiptId:receipt.id},orderBy:{containerProfileId:'asc'}});
  assert.deepEqual(allocations.map(item=>[item.containerProfileId,item.quantity,item.legacyLinkId,item.responsibleEmployeeId]),[[two.id,2,link.id,null],[three.id,3,link.id,null]]);
  assert.equal((await (await call(path,'POST',input)).json()).replayed,true);
  assert.equal((await call(path,'POST',{...input,reason:'Different document'})).status,409);
  assert.equal((await call(path,'POST',{...input,actionKey:uuid()})).status,409);
  assert.equal(await db.receiptAllocation.count({where:{receiptId:receipt.id}}),2);
  // Linked profiles become transfer sources; the timeline shows the link, not a new receipt.
  const sources=(await (await call('/api/pre-storage-setup/receipt-sources')).json()).sources.filter(item=>item.receiptId===receipt.id);
  assert.equal(sources.length,2);assert.ok(sources.every(item=>item.linkedLater&&item.available>0));
  const timeline=(await (await call('/api/shipping-informations/'+shipment.id)).json()).timeline.events;
  assert.ok(timeline.some(event=>event.title==='Earlier receipt linked by administrator'&&/2024-03-01/.test(event.detail)));
  assert.ok(!timeline.some(event=>event.title==='Pre-storage receipt recorded'));
  row=await overview();
  assert.equal(row.figures.unlinkedQuantity,4);assert.equal(row.figures.recordedQuantity,9);
  // Corrections: only the latest count, only once, only by an administrator.
  const verify=async(countedQuantity)=>{ const current=await overview(); return (await (await call('/api/storage-reconciliation/verifications','POST',{area:'PRE_STORAGE',locationId:hall.id,countedQuantity,expectedVersion:current.version,reason:'Physical count',actionKey:uuid()})).json()).verification; };
  const older=await verify(10);
  const newer=await verify(3);
  row=await overview();
  assert.equal(row.lastVerification.id,newer.id);assert.equal(row.lastVerification.correction,null);
  const correctionPath='/api/storage-reconciliation/corrections';
  const report={incident:'Three containers fewer than recorded found during the monthly count',cause:'Under investigation; earlier receipts were recorded before profile links existed',actions:'Security notified, search of adjacent halls',references:'Count list CL-2026-09-24'};
  const approval={verificationId:newer.id,expectedVersion:row.lastVerification.correctionVersion,report,actionKey:uuid()};
  assert.equal((await call(correctionPath,'POST',{...approval,report:{...report,cause:''},actionKey:uuid()})).status,400);
  assert.equal((await call(correctionPath,'POST',{...approval,report:{incident:'x'},actionKey:uuid()})).status,400);
  assert.equal((await call(correctionPath,'POST',approval,supervisorSession)).status,403);
  assert.equal((await call(correctionPath,'POST',{...approval,verificationId:older.id,actionKey:uuid()})).status,409);
  assert.equal((await call(correctionPath,'POST',{...approval,expectedVersion:'0'.repeat(64),actionKey:uuid()})).status,409);
  const approved=await call(correctionPath,'POST',approval);
  assert.equal(approved.status,200);
  const correction=(await approved.json()).correction;
  assert.equal(correction.delta,-6);assert.equal(correction.before.recordedQuantity,9);assert.equal(correction.actorId,admin.id);
  assert.deepEqual(correction.report,report);
  assert.equal((await (await call(correctionPath,'POST',approval)).json()).replayed,true);
  assert.equal((await call(correctionPath,'POST',{...approval,actionKey:uuid()})).status,409);
  row=await overview();
  assert.equal(row.figures.recordedQuantity,3);assert.equal(row.figures.corrected,-6);assert.equal(row.lastVerification.correction.id,correction.id);
  const hallInventory=(await (await call('/api/pre-storage-setup/pre-storage-location')).json()).preStorageLocationData.find(item=>item.id===hall.id).inventory;
  assert.equal(hallInventory.quantity,3);
  // Receipts and links are unchanged; a matching count needs no correction.
  assert.equal(await db.preStorageEntry.count({where:{preStorageLocationId:hall.id}}),2);
  assert.equal(await db.receiptAllocation.count({where:{locationId:hall.id}}),2);
  const same=await verify(3);
  const current=await overview();
  assert.equal((await call(correctionPath,'POST',{verificationId:same.id,expectedVersion:current.lastVerification.correctionVersion,report,actionKey:uuid()})).status,400);
  // New transfer approvals from the hall are limited to the corrected stock (3), although linked sources still show 5.
  const availability=(await (await call('/api/final-storage-setup/pre-storage-availability')).json()).halls.find(item=>item.id===hall.id);
  assert.deepEqual([availability.recorded,availability.reserved,availability.available,availability.corrected],[3,0,3,-6]);
  const sourceData=await (await call('/api/pre-storage-setup/receipt-sources')).json();
  assert.equal(sourceData.halls.find(item=>item.id===hall.id).available,3);
  const linkedSources=sourceData.sources.filter(item=>item.receiptId===receipt.id);
  assert.equal(linkedSources.reduce((total,item)=>total+item.available,0),5);
  const room=await db.finalStorageLocation.create({data:{organizationId,name:'Corrected stock room',containerType:'Link type',containerFootprint:1,surfaceArea:100,depth:2}});
  const requester=await db.finalStorageResponsibleEmployee.create({data:{organizationId,name:'Cap',surname:'Requester',dateOfBirth:new Date('1980-01-01'),qualifications:'Demo',address:'Demo',safetyTraining:true}});
  const transferPath='/api/final-storage-setup/final-storage-transver-request';
  const request=await (await call(transferPath,'POST',{requestedQuantity:4,requestedByRoom:room.name,requestedByEmployeeId:requester.id,finalStorageLocationId:room.id,actionKey:uuid()})).json();
  const approve=sources=>call(transferPath,'PUT',{operationType:'PRE_STORAGE_ACCEPT_REQUEST',data:{id:request.transferId,expectedVersion:0,actionKey:uuid(),requestedQuantity:sources.reduce((total,item)=>total+item.quantity,0),approvedByEmployeeId:person.id,sources}});
  const [sourceTwo,sourceThree]=linkedSources.sort((a,b)=>a.quantity-b.quantity);
  const capped=await approve([{receiptAllocationId:sourceTwo.id,quantity:1},{receiptAllocationId:sourceThree.id,quantity:3}]);
  assert.equal(capped.status,409);assert.match((await capped.json()).message,/can release 3 containers/);
  assert.equal(await db.transferSource.count({where:{transferId:request.transferId}}),0);
  assert.equal((await approve([{receiptAllocationId:sourceThree.id,quantity:3}])).status,200);
  const afterApproval=(await (await call('/api/final-storage-setup/pre-storage-availability')).json()).halls.find(item=>item.id===hall.id);
  assert.deepEqual([afterApproval.recorded,afterApproval.reserved,afterApproval.available],[3,3,0]);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession='next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(foreignUser.id)}});
  assert.equal((await call(correctionPath,'POST',{...approval,actionKey:uuid()},foreignSession)).status,404);
});

integration('one alert per hall lists its problems; workers and Supervision message, Supervision reads and resolves', async () => {
  const uuid=()=>require('node:crypto').randomUUID();
  const organizationId=orgA.id, HOUR=3600000;
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const base={password:'not-a-login-hash',companyId:1,companyName:'A',address:'A',administrator:false,organizationId};
  const preWorker=await db.userProfile.create({data:{...base,email:'alerts-pre@test.example',role:'EMPLOYEE',workArea:'PRE_STORAGE'}});
  const finalWorker=await db.userProfile.create({data:{...base,email:'alerts-final@test.example',role:'EMPLOYEE',workArea:'FINAL_STORAGE'}});
  const preSession=await session(preWorker), finalSession=await session(finalWorker);
  const supervisor=await db.userProfile.findUniqueOrThrow({where:{username:'test.supervisor'}});
  const supervisorSession=await session(supervisor);
  const hall=await db.preStorageLocation.create({data:{organizationId,name:'Alert hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const person=await db.preStorageResponsibleEmployee.create({data:{organizationId,name:'Alert',surname:'Person',dateOfBirth:new Date('1980-01-01'),address:'Demo',qualifications:'Demo',safetyTraining:true}});
  const rulesPath='/api/pre-storage-setup/monitoring-rules', alertsPath='/api/pre-storage-setup/alerts';
  // Rules: defaults are unconfirmed; only administrators add a confirmed version.
  const rules=await (await call(rulesPath+'?location='+hall.id,'GET',undefined,preSession)).json();
  assert.equal(rules.locations[0].rules.RADIATION.confirmed,false);assert.equal(rules.locations[0].rules.RADIATION.intervalHours,12);
  const ruleInput={locationId:hall.id,parameter:'RADIATION',values:{lowerDanger:null,lowerWarning:null,upperWarning:0.2,upperDanger:1,intervalHours:12},approvalReference:'RPO J. Doe, procedure RP-7 rev 3',reason:'Confirmed hall limits',expectedRuleId:null,actionKey:uuid()};
  assert.equal((await call(rulesPath,'POST',ruleInput,supervisorSession)).status,403);
  assert.equal((await call(rulesPath,'POST',{...ruleInput,values:{...ruleInput.values,upperDanger:0.1},actionKey:uuid()})).status,400);
  assert.equal((await call(rulesPath,'POST',{...ruleInput,approvalReference:'x',actionKey:uuid()})).status,400);
  const savedRule=await call(rulesPath,'POST',ruleInput);
  assert.equal(savedRule.status,200);
  const ruleId=(await savedRule.json()).rule.id;
  assert.equal((await (await call(rulesPath,'POST',ruleInput)).json()).replayed,true);
  assert.equal((await call(rulesPath,'POST',{...ruleInput,actionKey:uuid()})).status,409);
  assert.equal((await (await call(rulesPath+'?location='+hall.id)).json()).locations[0].rules.RADIATION.ruleId,ruleId);
  // Measurements: values are classified with the hall's rule.
  const measure=async(values,key=uuid())=>{ const response=await call('/api/pre-storage-setup/pre-storage-conditions','POST',{submissionKey:key,preStorageTemperature:20,preStorageRadiationLevel:0.1,preStorageHumidity:50,preStoragePressure:1015,preStorageLocationId:hall.id,preStorageResponsibleEmployeeId:person.id,...values},preSession); assert.equal(response.status,200); return response.json(); };
  assert.equal((await measure({})).alert,null);
  // Values read from a device are saved only when each one was checked.
  const deviceBody={submissionKey:uuid(),preStorageTemperature:20,preStorageRadiationLevel:0.1,preStorageHumidity:50,preStoragePressure:1015,preStorageLocationId:hall.id,preStorageResponsibleEmployeeId:person.id};
  const unchecked=await call('/api/pre-storage-setup/pre-storage-conditions','POST',{...deviceBody,readingSource:{readings:[{field:'Temperature',method:'BLUETOOTH',device:'TH-204'},{field:'Humidity',method:'CODE',device:'HY-9'}],confirmed:['Temperature']}},preSession);
  assert.equal(unchecked.status,400);
  assert.equal((await call('/api/pre-storage-setup/pre-storage-conditions','POST',{...deviceBody,readingSource:{readings:[{field:'Temperature',method:'FAX'}],confirmed:['Temperature']}},preSession)).status,400);
  const fromDevice=await measure({readingSource:{readings:[{field:'Humidity',method:'CODE',device:'HY-9'},{field:'Temperature',method:'BLUETOOTH',device:'TH-204'}],confirmed:['Temperature','Humidity']}});
  assert.deepEqual((await db.preStorageConditions.findUniqueOrThrow({where:{id:fromDevice.measurement.id}})).readingSource,{readings:[{field:'Temperature',method:'BLUETOOTH',device:'TH-204'},{field:'Humidity',method:'CODE',device:'HY-9'}]});
  // One alert per hall lists every parameter outside range, worst first.
  const first=await measure({preStorageRadiationLevel:0.5});
  assert.deepEqual(first.alert.problems.map(row=>[row.key,row.level]),[['RADIATION','warning']]);
  const alertId=first.alert.id;
  const repeatKey=uuid();
  const second=await measure({preStorageRadiationLevel:0.6,preStorageHumidity:80},repeatKey);
  assert.equal(second.alert.id,alertId);
  assert.deepEqual(second.alert.problems.map(row=>[row.key,row.level]),[['HUMIDITY','danger'],['RADIATION','warning']]);
  assert.equal((await measure({preStorageRadiationLevel:0.6,preStorageHumidity:80},repeatKey)).replayed,true);
  let alert=await db.hallAlert.findUniqueOrThrow({where:{id:alertId}});
  assert.equal(alert.severity,'CRITICAL');
  await assert.rejects(db.hallAlert.create({data:{organizationId,area:'PRE_STORAGE',locationId:hall.id,severity:'WARNING',problems:[]}}),{code:'P2002'});
  const detail=await (await call(`${alertsPath}?alertId=${alertId}`,'GET',undefined,preSession)).json();
  assert.deepEqual(detail.latest.values.map(row=>[row.key,row.value,row.level]),[['TEMPERATURE',20,'optimal'],['RADIATION',0.6,'warning'],['HUMIDITY',80,'danger'],['PRESSURE',1015,'optimal']]);
  assert.equal((await call(`/api/final-storage-setup/alerts?alertId=${alertId}`,'GET',undefined,finalSession)).status,404);
  // Workers write messages; Supervision marks the alert read and resolves it.
  const act=(action,text='',who=supervisorSession,id=alertId)=>call(alertsPath,'POST',{alertId:id,action,text},who);
  assert.equal((await act('READ','',preSession)).status,403);
  assert.equal((await act('MESSAGE','',preSession)).status,400);
  assert.equal((await act('MESSAGE','Humidity rose after the door was left open',preSession)).status,200);
  assert.equal((await act('READ')).status,200);
  assert.ok((await db.hallAlert.findUniqueOrThrow({where:{id:alertId}})).readAt);
  assert.equal((await act('MESSAGE','Please measure again once the door is closed')).status,200);
  assert.equal((await act('RESOLVE')).status,409, 'not resolved while values are outside range');
  // A problem that gets worse makes the alert unread again.
  await measure({preStorageRadiationLevel:1.5,preStorageHumidity:80});
  assert.equal((await db.hallAlert.findUniqueOrThrow({where:{id:alertId}})).readAt,null);
  assert.equal((await act('READ')).status,200);
  const normal=await measure({});
  assert.equal(normal.alert.id,alertId); assert.deepEqual(normal.alert.problems,[]);
  assert.equal((await act('RESOLVE','x'.repeat(1001))).status,400);
  assert.equal((await act('RESOLVE','Door seal replaced; humidity back in range')).status,200);
  assert.equal((await act('MESSAGE','Late message',preSession)).status,409);
  alert=await db.hallAlert.findUniqueOrThrow({where:{id:alertId}});
  assert.equal(alert.resolveNote,'Door seal replaced; humidity back in range'); assert.equal(alert.resolvedById,supervisor.id);
  const entries=await db.hallAlertEntry.findMany({where:{alertId},orderBy:{id:'asc'}});
  assert.deepEqual(entries.map(row=>row.type),['OPENED','MEASURED','MESSAGE','READ','MESSAGE','MEASURED','READ','MEASURED','RESOLVED']);
  const resolvedList=await (await call(alertsPath+'?view=resolved&location='+hall.id,'GET',undefined,preSession)).json();
  assert.deepEqual(resolvedList.alerts[0].seen.map(row=>[row.key,row.level]),[['RADIATION','danger'],['HUMIDITY','danger']]);
  // A new deviation after resolving opens a new alert.
  const again=(await measure({preStorageRadiationLevel:0.4})).alert;
  assert.notEqual(again.id,alertId);
  // An overdue measurement is added once, at the moment the shortest interval passed.
  const late=await db.preStorageLocation.create({data:{organizationId,name:'Late hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const measuredAt=new Date(Date.now()-30*HOUR);
  await db.preStorageConditions.create({data:{organizationId,createdAt:measuredAt,preStorageTemperature:20,preStorageRadiationLevel:0.05,preStorageHumidity:50,preStoragePressure:1015,preStorageLocationId:late.id,preStorageResponsibleEmployeeId:person.id}});
  const empty=await db.preStorageLocation.create({data:{organizationId,name:'Never measured hall',surfaceArea:100,containerFootprint:1,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const list=await (await call(alertsPath+'?location='+late.id,'GET',undefined,preSession)).json();
  assert.equal(list.alerts.length,1);
  const overdue=list.alerts[0];
  assert.deepEqual(overdue.problems.map(row=>row.key),['OVERDUE']);
  assert.equal(new Date(overdue.openedAt).getTime(),measuredAt.getTime()+12*HOUR);
  await call(alertsPath+'?location='+late.id,'GET',undefined,preSession);
  assert.equal(await db.hallAlertEntry.count({where:{alertId:overdue.id}}),1);
  const all=await (await call(alertsPath,'GET',undefined,preSession)).json();
  assert.ok(all.noData.some(row=>row.locationId===empty.id));
  const lateMeasurement=await call('/api/pre-storage-setup/pre-storage-conditions','POST',{submissionKey:uuid(),preStorageTemperature:20,preStorageRadiationLevel:0.05,preStorageHumidity:50,preStoragePressure:1015,preStorageLocationId:late.id,preStorageResponsibleEmployeeId:person.id},preSession);
  assert.equal(lateMeasurement.status,200);
  assert.deepEqual((await db.hallAlert.findUniqueOrThrow({where:{id:overdue.id}})).problems,[]);
  // A stored reading outside range without an alert (e.g. from before these alerts) opens one when noticed.
  await db.preStorageConditions.create({data:{organizationId,createdAt:new Date(),preStorageTemperature:45,preStorageRadiationLevel:0.05,preStorageHumidity:50,preStoragePressure:1015,preStorageLocationId:empty.id,preStorageResponsibleEmployeeId:person.id}});
  const stored=(await (await call(alertsPath+'?location='+empty.id,'GET',undefined,preSession)).json()).alerts[0];
  assert.deepEqual(stored.problems.map(row=>[row.key,row.level]),[['TEMPERATURE','danger']]);
  // Counts for the bell, area and organization boundaries.
  const home=await (await call('/api/workspace','GET',undefined,supervisorSession)).json();
  const pre=home.workspaces.find(row=>row.key==='PRE_STORAGE');
  assert.ok(pre.alerts.unread>0 && pre.alerts.open>=pre.alerts.unread);
  assert.equal((await call(alertsPath,'GET',undefined,finalSession)).status,403);
  const foreignUser=await db.userProfile.findUniqueOrThrow({where:{email:'prep-other@test.example'}});
  const foreignSession=await session(foreignUser);
  assert.ok(!(await (await call(alertsPath,'GET',undefined,foreignSession)).json()).alerts.some(row=>row.locationId===hall.id));
  assert.equal((await act('MESSAGE','Foreign attempt',foreignSession,again.id)).status,404);
  // Existing overview measurements use the hall's rule.
  const overview=await (await call('/api/pre-storage-setup/overview?view=measurements&location='+hall.id,'GET',undefined,preSession)).json();
  assert.equal(overview.rows[0].values.find(value=>value.key==='radiation').level,'warning');
});

integration('management overview is limited to management roles and matches the recorded data', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const org = await db.organization.create({ data:{ name:'Overview organization' } });
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const base={password:'not-a-login-hash',companyId:1,companyName:'A',address:'A',administrator:false,organizationId:org.id};
  const supervisor=await db.userProfile.create({data:{...base,email:'overview-supervisor@test.example',role:'SUPERVISION'}});
  const worker=await db.userProfile.create({data:{...base,email:'overview-pre@test.example',role:'EMPLOYEE',workArea:'PRE_STORAGE'}});
  const supervisorSession=await session(supervisor), workerSession=await session(worker);
  const fixture=await seedConcept(db, org.id);
  const hall=await db.preStorageLocation.create({data:{organizationId:org.id,name:'Overview hall',surfaceArea:100,containerFootprint:2,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  await db.preStorageEntry.create({data:{organizationId:org.id,quantity:10,preStorageLocationId:hall.id}});
  assert.equal((await call('/api/overview','GET',undefined,workerSession)).status,403);
  const response=await call('/api/overview','GET',undefined,supervisorSession);
  assert.equal(response.status,200);
  const overview=await response.json();
  const profiles=await db.containerProfile.findMany({where:{shippingInformationId:fixture.shipmentId}});
  assert.equal(overview.pipeline.arrived.trucks,1);
  assert.equal(overview.pipeline.content.profiles,profiles.length);
  assert.equal(overview.pipeline.content.containers,profiles.reduce((sum,row)=>sum+row.quantity,0));
  // Slots are surface area / footprint; the hall has no measurement yet.
  assert.deepEqual(overview.capacity.find(row=>row.id===hall.id),{area:'PRE_STORAGE',id:hall.id,name:'Overview hall',detail:'Demo',used:10,slots:50,percent:20,href:`/pre-storage/${hall.id}`});
  assert.deepEqual(Object.values(overview.conditions.find(row=>row.id===hall.id).cells),['nodata','nodata','nodata','nodata']);
  assert.equal(overview.movements.series.length,7);
  assert.equal(overview.movements.series.at(-1).received,10);
  assert.equal((await (await call('/api/overview?days=30','GET',undefined,supervisorSession)).json()).movements.series.length,30);
  // Recent shipments carry the same five-step journey as the shipment list.
  const recent=overview.recent.find(row=>row.id===fixture.shipmentId);
  assert.equal(recent.containers,profiles.reduce((sum,row)=>sum+row.quantity,0));
  assert.deepEqual(recent.journey.steps.map(step=>step.key),['arrival','content','receipt','departure']);
  assert.equal(recent.journey.steps[0].state,'done');
  // The overview counts the same trucks as the Step 1 home counters.
  const workspace=await (await call('/api/workspace','GET',undefined,supervisorSession)).json();
  const shipping=workspace.workspaces.find(row=>row.key==='SHIPPING');
  const count=key=>shipping.metrics.find(metric=>metric[3]===key)[1];
  assert.equal(count('missing')+count('recorded'),overview.pipeline.arrived.trucks);
  assert.equal(workspace.workspaces.find(row=>row.key==='PRE_STORAGE').locations.find(row=>row.id===hall.id).percent,20);
});

integration('statistics are available to every role and count only recorded events of the organization', async () => {
  const org = await db.organization.create({ data:{ name:'Statistics organization' } });
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const base={password:'not-a-login-hash',companyId:1,companyName:'A',address:'A',administrator:false,organizationId:org.id};
  const worker=await db.userProfile.create({data:{...base,email:'statistics-final@test.example',role:'EMPLOYEE',workArea:'FINAL_STORAGE'}});
  const hall=await db.preStorageLocation.create({data:{organizationId:org.id,name:'Statistics hall',surfaceArea:40,containerFootprint:2,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const shipment=await db.shippingInformation.create({data:{organizationId:org.id,companyName:'Stats',driverName:'Driver',registrationPlates:'STATS',entryDateTime:new Date(Date.now()-5*3600000)}});
  const receipt=await db.preStorageEntry.create({data:{organizationId:org.id,quantity:6,preStorageLocationId:hall.id}});
  // A receipt allocation needs a profile of the same organization.
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const fixture=await seedConcept(db, org.id);
  const profile=await db.containerProfile.findFirstOrThrow({where:{shippingInformationId:fixture.shipmentId}});
  await db.containerProfile.update({where:{id:profile.id},data:{shippingInformationId:shipment.id}});
  await db.receiptAllocation.create({data:{organizationId:org.id,receiptId:receipt.id,shipmentId:shipment.id,containerProfileId:profile.id,locationId:hall.id,quantity:6,actorId:worker.id}});
  const response=await call('/api/statistics','GET',undefined,await session(worker));
  assert.equal(response.status,200);
  const stats=await response.json();
  assert.equal(stats.days,30);
  assert.equal(stats.daily.length,30);
  assert.equal(stats.totals.received,6);
  // The shipment above and the one created by the concept seed.
  assert.equal(stats.totals.arrivals,2);
  // Waiting time runs from the shipment arrival (about 5 h earlier) to the receipt record.
  assert.equal(stats.waiting.receipts,1);
  assert.ok(stats.waiting.medianHours>4.9&&stats.waiting.medianHours<5.5,String(stats.waiting.medianHours));
  assert.equal(stats.waiting.buckets.find(row=>row.key==='2to8h').count,1);
  assert.deepEqual(stats.capacity.find(row=>row.id===hall.id),{area:'PRE_STORAGE',id:hall.id,name:'Statistics hall',used:6,slots:20,percent:30});
  assert.equal((await (await call('/api/statistics?days=90','GET',undefined,await session(worker))).json()).daily.length,90);
});

integration('transfer detail and profile custody show only recorded steps and respect work areas', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const org = await db.organization.create({ data:{ name:'Custody organization' } });
  const other = await db.organization.create({ data:{ name:'Other custody organization' } });
  const session=async user=>'next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{id:String(user.id)}});
  const base={password:'not-a-login-hash',companyId:1,companyName:'A',address:'A',administrator:false};
  const user=(email,role,workArea,organizationId=org.id)=>db.userProfile.create({data:{...base,organizationId,email,role,workArea}});
  const supervisor=await user('custody-supervisor@test.example','SUPERVISION');
  const shipping=await user('custody-shipping@test.example','EMPLOYEE','SHIPPING');
  const pre=await user('custody-pre@test.example','EMPLOYEE','PRE_STORAGE');
  const final=await user('custody-final@test.example','EMPLOYEE','FINAL_STORAGE');
  const foreign=await user('custody-foreign@test.example','SUPERVISION',null,other.id);
  const fixture=await seedConcept(db, org.id);
  const profile=await db.containerProfile.findFirstOrThrow({where:{shippingInformationId:fixture.shipmentId},orderBy:{id:'asc'}});
  const person={name:'Mara',surname:'Keller',dateOfBirth:new Date('1980-01-01'),address:'Private',qualifications:'Radiation protection',organizationId:org.id};
  const approver=await db.preStorageResponsibleEmployee.create({data:person});
  const requester=await db.finalStorageResponsibleEmployee.create({data:{...person,name:'Rita',surname:'Braun',safetyTraining:true}});
  const hall=await db.preStorageLocation.create({data:{organizationId:org.id,name:'Custody hall',surfaceArea:100,containerFootprint:2,preStorageFor:'Demo',containerType:'Demo',wasteProfile:'Demo'}});
  const room=await db.finalStorageLocation.create({data:{organizationId:org.id,name:'Custody room',containerType:'Demo',containerFootprint:2,surfaceArea:100,depth:5}});
  const entry=await db.preStorageEntry.create({data:{organizationId:org.id,quantity:profile.quantity,preStorageLocationId:hall.id,responsiblePreStorageEmployeeId:approver.id}});
  const receipt=await db.receiptAllocation.create({data:{organizationId:org.id,receiptId:entry.id,shipmentId:fixture.shipmentId,containerProfileId:profile.id,locationId:hall.id,quantity:profile.quantity,actorId:pre.id,responsibleEmployeeId:approver.id}});
  const moved=Math.min(2,profile.quantity);
  const transfer=await db.storageTransferRequest.create({data:{organizationId:org.id,requestedQuantity:moved,requestedByRoom:room.name,requestedByEmployeeId:requester.id,finalStorageLocationId:room.id,approvedByEmployeeId:approver.id,preStorageStatus:'accepted',finalStorageStatus:'transportPending',version:1}});
  const action=(name,actorId,extra={})=>db.transferAction.create({data:{organizationId:org.id,transferId:transfer.id,action:name,quantity:moved,actorId,actionKey:require('node:crypto').randomUUID(),fingerprint:'test',...extra}});
  await action('TRANSFER_REQUESTED',final.id);
  const approval=await action('PRE_STORAGE_ACCEPT_REQUEST',pre.id);
  const source=await db.transferSource.create({data:{organizationId:org.id,transferId:transfer.id,receiptAllocationId:receipt.id,shipmentId:fixture.shipmentId,containerProfileId:profile.id,locationId:hall.id,destinationId:room.id,quantity:moved,state:'reserved',approvalActionId:approval.id}});

  // Transfer: approved and in transport; only final storage may confirm receipt.
  const transferPath=`/api/transfers/${transfer.id}`;
  assert.equal((await call(transferPath,'GET',undefined,await session(shipping))).status,403);
  assert.equal((await call(transferPath,'GET',undefined,await session(foreign))).status,404);
  const forPre=await (await call(transferPath,'GET',undefined,await session(pre))).json();
  assert.deepEqual(forPre.steps.map(step=>[step.key,step.state]),[['request','done'],['approval','done'],['transport','current'],['receipt','upcoming']]);
  assert.equal(forPre.steps[1].actorId,pre.id);
  assert.equal(forPre.transfer.approvedByEmployee.name,'Mara Keller');
  assert.equal(forPre.transfer.requestedByEmployee.name,'Rita Braun');
  assert.equal(JSON.stringify(forPre).includes('Private'),false,'personal fields of responsible persons stay private');
  assert.deepEqual(forPre.sources.map(row=>[row.hall,row.quantity,row.state,row.receiptId]),[['Custody hall',moved,'reserved',entry.id]]);
  assert.deepEqual(forPre.permissions,{canApprove:false,canReceive:false});
  const forFinal=await (await call(transferPath,'GET',undefined,await session(final))).json();
  assert.deepEqual(forFinal.permissions,{canApprove:false,canReceive:true});
  assert.deepEqual(forFinal.destination,{id:room.id,name:'Custody room',containerType:'Demo',used:0,slots:50});

  // Custody before the final receipt: containers split between hall and reservation.
  const profilePath=`/api/profiles/${profile.id}`;
  assert.equal((await call(profilePath,'GET',undefined,await session(foreign))).status,404);
  const early=await (await call(profilePath,'GET',undefined,await session(shipping))).json();
  assert.deepEqual(early.permissions,{canOpenShipment:true,canOpenTransfers:false});
  assert.deepEqual(early.location,{notReceived:0,halls:profile.quantity>moved?[{id:hall.id,name:'Custody hall',quantity:profile.quantity-moved}]:[],reserved:[{id:transfer.id,name:`#${transfer.id}`,quantity:moved}],final:[]});
  assert.deepEqual(early.rows.map(row=>row.kind),['receipt','transferRequested','transferApproved']);
  assert.equal(early.rows[0].responsible,'Mara Keller');
  assert.equal(early.notes.arrivalMissing,true);
  assert.deepEqual(early.stages.map(row=>row.state),['done','done','done','current','upcoming']);

  // After the final receipt the custody shows the room and the steps close.
  const receipt2=await action('FINAL_STORAGE_ACCEPT_RESPONSE',final.id);
  await db.transferSource.update({where:{id:source.id},data:{state:'completed',resolutionActionId:receipt2.id}});
  await db.storageTransferRequest.update({where:{id:transfer.id},data:{preStorageStatus:'completed',finalStorageStatus:'accepted',version:2}});
  const done=await (await call(transferPath,'GET',undefined,await session(supervisor))).json();
  assert.deepEqual(done.steps.map(step=>step.state),['done','done','done','done']);
  assert.equal(done.steps[3].actorId,final.id);
  assert.deepEqual(done.events.map(row=>row.action),['TRANSFER_REQUESTED','PRE_STORAGE_ACCEPT_REQUEST','FINAL_STORAGE_ACCEPT_RESPONSE']);
  const late=await (await call(profilePath,'GET',undefined,await session(pre))).json();
  assert.deepEqual(late.location.final,[{id:room.id,name:'Custody room',quantity:moved}]);
  assert.equal(late.rows.at(-1).kind,'finalReceipt');
  assert.deepEqual(late.permissions,{canOpenShipment:false,canOpenTransfers:true});

  // Pages follow the same areas.
  const { pageAllowed } = require('../lib/workspaces.cjs');
  assert.equal(pageAllowed(shipping,'/transfers/1'),false);
  assert.equal(pageAllowed(pre,'/transfers/1'),true);
  assert.equal(pageAllowed(shipping,'/profiles/1'),true);
});
