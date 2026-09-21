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
  const response = await call('/api/container-profile/location-origin','DELETE',{ id: recordB.id });
  assert.equal(response.status,404);
  assert.ok(await db.locationOrigin.findUnique({ where: { id: recordB.id } }));
  await assert.rejects(db.$transaction(tx => createScopedDatabase(tx,orgA.id).locationOrigin.update({ where:{ id:recordB.id },data:{name:'Tampered'} })), { code:'P2025' });
});
integration('cross-organization references and invalid quantities are rejected', async () => {
  const shipment = await db.shippingInformation.create({ data:{ companyName:'A',driverName:'Driver',registrationPlates:'TEST',organizationId:orgA.id } });
  const type = await db.containerType.create({ data:{name:'A',material:'steel',volume:1,carryingCapacity:1,radioactivityLevel:'demo',physicalProperties:'demo',footprint:1,description:'demo',organizationId:orgA.id} });
  const waste = await db.wasteProfile.create({ data:{name:'A',typeOfWaste:'demo',wasteDescription:'demo',risksAndHazards:'demo',processingMethods:'demo',physicalProperties:'demo',chemicalProperties:'demo',biologicalProperties:'demo',collectionProcedures:'demo',containerTypeId:type.id,organizationId:orgA.id} });
  const payload = {quantity:1,shippingInformationId:shipment.id,locationOriginId:recordB.id,wasteProfileId:waste.id};
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
    ['/api/shipping-informations', 'DELETE', { id:shipment.id }],
    ['/api/container-profile', 'POST', containerData],
    ['/api/container-profile', 'PUT', { preparedData:{ id:container.id, quantity:2, locationOrigin:recordA.id, wasteProfile:waste.id, actionKey:require('node:crypto').randomUUID(), reason:'Correct profile quantity', expected:{quantity:container.quantity,locationOriginId:recordA.id,wasteProfileId:waste.id,containerStatus:'pending',truckStatus:'OUT'} } }],
    ['/api/container-profile', 'PATCH', { containerStatusUpdateData:{ containerProfileId:container.id, containerStatus:'accepted' } }],
    ['/api/container-profile', 'DELETE', { id:container.id }],
  ];
  for (const [path, method, body] of edits) {
    assert.equal((await call(path, method, body, memberCookie)).status, 403, method + ' ' + path);
  }
  assert.equal((await db.shippingInformation.findUnique({ where:{ id:shipment.id } })).truckStatus, 'OUT');
  assert.equal((await db.containerProfile.findUnique({ where:{ id:container.id } })).quantity, 1);
  for (const index of [0, 3, 4, 6, 2]) {
    const [path, method, body] = edits[index];
    assert.equal((await call(path, method, body)).status, 200, 'Administrator: ' + method + ' ' + path);
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
    assert.equal((await call('/api/shipping-informations', 'DELETE', { id:shipment.id }, session)).status, 403);
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
  assert.equal((await call('/api/container-profile','POST',{ quantity:1, shippingInformationId:first.shipmentId, locationOriginId:first.locationOriginIds[0], wasteProfileId:first.wasteProfileIds[0] })).status,200);
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
    for (const method of ['POST','PUT','DELETE']) {
      assert.equal((await call(path,method,{},memberCookie)).status,403,method+' '+path);
    }
  }
  assert.equal((await call('/api/container-profile/location-origin','POST',{name:'Admin managed source',address:'Demo',origin:'Demo'})).status,200);
});
integration('waste profiles keep their own container type and reject occupied types without changing data', async () => {
  const { seedConcept } = require('../prisma/seed-concept.cjs');
  const fixture = await seedConcept(db, orgA.id);
  const current = await db.wasteProfile.findUniqueOrThrow({ where:{ id:fixture.wasteProfileIds[0] } });
  const other = await db.wasteProfile.findUniqueOrThrow({ where:{ id:fixture.wasteProfileIds[1] } });
  const { organizationId, ...dataForUpdate } = current;
  assert.equal(organizationId,orgA.id);
  assert.equal((await call('/api/container-profile/waste-profile','PUT',{dataForUpdate})).status,200);
  const response = await call('/api/container-profile/waste-profile','PUT',{dataForUpdate:{...dataForUpdate,name:'Must not persist',containerTypeId:other.containerTypeId}});
  assert.equal(response.status,409);
  assert.match((await response.json()).message,/already assigned/);
  assert.deepEqual(await db.wasteProfile.findUniqueOrThrow({where:{id:current.id}}),current);
  const { id, containerTypeId, ...fields } = dataForUpdate;
  assert.ok(id);
  const create = await call('/api/container-profile/waste-profile','POST',{...fields,recommendationsForTransport:containerTypeId});
  assert.equal(create.status,409);
  assert.match((await create.json()).message,/already assigned/);
  const spare = await db.containerType.create({data:{organizationId:orgA.id,name:'Spare',material:'Demo',volume:1,carryingCapacity:1,footprint:1,radioactivityLevel:'Demo',physicalProperties:'Demo',description:'Demo'}});
  assert.equal((await call('/api/container-profile/waste-profile','PUT',{dataForUpdate:{...dataForUpdate,containerTypeId:spare.id}})).status,200);
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
  const alerts=await (await call(url+'?view=alerts&location='+hall.id,'GET',undefined,session)).json();
  assert.equal(alerts.total,0, 'older abnormal readings do not remain active alerts');
  const missing=await db.preStorageLocation.create({data:{organizationId:orgA.id,name:'No measurements',surfaceArea:100,containerFootprint:2,containerType:'M01',wasteProfile:'M01',preStorageFor:'Test'}});
  const unknown=await (await call(url+'?view=alerts&location='+missing.id,'GET',undefined,session)).json();
  assert.equal(unknown.rows[0].level,'unknown'); assert.equal(unknown.rows[0].date,null);
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
    for(const [,count,href] of dashboard.workspaces[0].metrics.filter(metric=>metric[2])) {
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
  assert.deepEqual(inventory,{quantity:7,storedQuantity:7,linkedReceived:0,unlinkedTransfers:1});
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
  assert.equal((await call(path,'DELETE',{id:profile.id})).status,409);
  assert.equal((await call(path,'PATCH',{containerStatusUpdateData:{containerProfileId:profile.id,containerStatus:'rejected'}})).status,409);
  assert.equal((await call('/api/shipping-informations','DELETE',{id:shipment.id})).status,409);
  assert.equal((await (await call(detailPath)).json()).shippingData.containerProfiles[0].correctionLocked,true);
  assert.equal((await send(next,supervisorSession)).status,200);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).containerStatus,'accepted');
  assert.equal(await db.containerCorrection.count({where:{containerProfileId:profile.id}}),2);
  // Receipt history remains authoritative even if a legacy profile flag is incorrect.
  await db.containerProfile.update({where:{id:profile.id},data:{containerStatus:'pending'}});
  assert.equal((await send({...lockedChange,expected:{...lockedChange.expected,containerStatus:'pending'}})).status,409);
  assert.equal((await db.preStorageEntry.findUniqueOrThrow({where:{id:receipt.id}})).quantity,7);
  assert.equal((await db.containerProfile.findUniqueOrThrow({where:{id:profile.id}})).quantity,7);
});
