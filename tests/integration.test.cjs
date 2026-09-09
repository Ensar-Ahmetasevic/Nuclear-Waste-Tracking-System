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
  const user = { email: 'admin@test.example', password: 'not-a-login-hash', companyId: 1, companyName: 'A', address: 'A', administrator: true, organizationId: orgA.id };
  admin = await db.userProfile.create({ data: user });
  member = await db.userProfile.create({ data: { ...user, email: 'member@test.example', administrator: false } });
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
  assert.equal((await call('/api/container-profile/location-origin')).status,403);
  await db.userProfile.update({where:{id:admin.id},data:{active:true}});
});
integration('public registration ignores submitted privileges and creates a pending account', async () => {
  const response = await call('/api/auth/register','POST',{email:'new@test.example',password:'long-test-password',companyId:1,companyName:'A',address:'A',administrator:true,active:true,organizationId:orgA.id},null);
  assert.equal(response.status,201);
  const user = await db.userProfile.findUnique({where:{email:'new@test.example'}});
  assert.equal(user.administrator,false);assert.equal(user.active,false);assert.equal(user.organizationId,null);
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
  await db.userProfile.update({ where: { id: admin.id }, data: { administrator: false } });
  try { assert.equal((await call('/api/container-profile/location-origin', 'DELETE', { id: recordA.id })).status, 403); }
  finally { await db.userProfile.update({ where: { id: admin.id }, data: { administrator: true } }); }
});
integration('authentication rate limits are shared atomically across concurrent attempts', async () => {
  const { rateLimit } = require('../lib/server/rate-limit.cjs');
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => rateLimit('integration', 'same-account', 3)));
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 3);
  for (const result of results.filter(item => item.status === 'rejected')) assert.equal(result.reason.status, 429);
});
