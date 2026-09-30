// Seeds the examples from "Nuclear Waste Tracking System - Concept doc.pdf" (see concept-data.cjs).
// Every function is idempotent: records are looked up by name and never overwritten.
const { createHash, randomUUID } = require('node:crypto');
const concept = require('./concept-data.cjs');

// The PDF gives only the time of day; use its most recent occurrence in Berlin.
function latestArrival(time, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'longOffset' });
  for (const daysBack of [0, 1]) {
    const date = day.format(new Date(now.getTime() - daysBack * 86400000));
    const offset = zone.formatToParts(new Date(`${date}T${time}Z`)).find(part => part.type === 'timeZoneName').value.slice(3) || 'Z';
    const at = new Date(`${date}T${time}${offset}`);
    if (at <= now) return at;
  }
}

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// With actors, a new shipment gets the arrival and preparation records the Step 1 forms write.
async function seedConcept(prisma, organizationId, { arrivalActorId, preparationActorId } = {}) {
  return prisma.$transaction(async tx => {
    async function ensure(model, name, data) {
      const existing = await tx[model].findFirst({ where:{ organizationId, name } });
      if (existing) return existing;
      // Names are editable. A renamed profile still owns its container type;
      // reuse it without overwriting the user's name or other changes.
      if (model === 'wasteProfile') {
        const assigned = await tx.wasteProfile.findFirst({
          where: { organizationId, containerTypeId: data.containerTypeId },
        });
        if (assigned) return assigned;
      }
      return tx[model].create({ data:{ organizationId, name, ...data } });
    }
    const profiles = [];
    for (const group of concept.groups) {
      const { name: typeName, ...type } = group.container;
      const container = await ensure('containerType', typeName, type);
      const { name: wasteName, ...waste } = group.waste;
      const wasteProfile = await ensure('wasteProfile', wasteName, { ...waste, containerTypeId: container.id });
      const { name: originName, ...origin } = group.location;
      const location = await ensure('locationOrigin', originName, origin);
      profiles.push({ organizationId, quantity: group.quantity, locationOriginId: location.id, wasteProfileId: wasteProfile.id });
    }
    const { arrivalTime, ...truck } = concept.shipment;
    const { companyName, driverName, registrationPlates } = truck;
    let shipment = await tx.shippingInformation.findFirst({ where:{ organizationId, companyName, driverName, registrationPlates } });
    if (!shipment) {
      shipment = await tx.shippingInformation.create({ data:{ organizationId, ...truck, entryDateTime: latestArrival(arrivalTime) } });
      const snapshot = { companyName, driverName, registrationPlates };
      if (arrivalActorId) await tx.shipmentArrival.create({ data:{
        organizationId, shipmentId: shipment.id, actorId: arrivalActorId, actionKey: randomUUID(),
        fingerprint: hash([snapshot, arrivalActorId]), snapshot, createdAt: shipment.entryDateTime,
      } });
      for (const data of profiles) {
        const profile = await tx.containerProfile.create({ data:{ ...data, shippingInformationId: shipment.id } });
        if (!preparationActorId) continue;
        const { quantity, locationOriginId, wasteProfileId } = data;
        const { containerTypeId } = await tx.wasteProfile.findUniqueOrThrow({ where:{ id: wasteProfileId } });
        const reviewed = { truckStatus: shipment.truckStatus, status: shipment.status, containerTypeId };
        await tx.containerPreparation.create({ data:{
          organizationId, shipmentId: shipment.id, containerProfileId: profile.id, actorId: preparationActorId, actionKey: randomUUID(),
          fingerprint: hash([{ quantity, locationOriginId, wasteProfileId, shippingInformationId: shipment.id }, reviewed, '', preparationActorId]),
          snapshot: { quantity, locationOriginId, wasteProfileId, containerTypeId, truckStatus: shipment.truckStatus, containerStatus: 'pending' },
          createdAt: profile.createdAt,
        } });
      }
    }
    return { shipmentId:shipment.id, wasteProfileIds:profiles.map(row => row.wasteProfileId), locationOriginIds:profiles.map(row => row.locationOriginId) };
  });
}

// Step 2 halls, Step 3 rooms and the responsible employees of both areas. With the
// recording accounts, a hall or room without measurements and alerts gets its first measurement.
async function seedStorage(prisma, organizationId, { preStorageActorId, finalStorageActorId } = {}) {
  return prisma.$transaction(async tx => {
    const ensure = async (model, where, data) =>
      (await tx[model].findFirst({ where:{ organizationId, ...where } })) || tx[model].create({ data:{ organizationId, ...data } });
    const areas = [
      { area: 'PRE_STORAGE', prefix: 'preStorage', locations: concept.preStorageLocations, people: concept.preStorageEmployees, conditions: concept.preStorageConditions, actorId: preStorageActorId },
      { area: 'FINAL_STORAGE', prefix: 'finalStorage', locations: concept.finalStorageLocations, people: concept.finalStorageEmployees, conditions: concept.finalStorageConditions, actorId: finalStorageActorId },
    ];
    for (const { area, prefix, locations, people, conditions, actorId } of areas) {
      const location = {}, employee = {};
      for (const data of locations) location[data.name] = await ensure(`${prefix}Location`, { name: data.name }, data);
      for (const person of people) {
        employee[`${person.name} ${person.surname}`] = await ensure(`${prefix}ResponsibleEmployee`, { name: person.name, surname: person.surname }, { ...person, dateOfBirth: new Date(`${person.dateOfBirth}T00:00:00Z`) });
      }
      if (!actorId) continue;
      // Measurements are recorded through the app so alerts are evaluated; only a
      // location without any history can take one here without an alert evaluation.
      const measurements = area === 'PRE_STORAGE' ? tx.preStorageConditions : tx.finalStorageCondition;
      for (const { location: name, employee: person, ...values } of conditions) {
        const locationId = location[name].id;
        if (await measurements.findFirst({ where:{ organizationId, [`${prefix}LocationId`]: locationId } })) continue;
        if (await tx.hallAlert.findFirst({ where:{ organizationId, area, locationId } })) continue;
        await measurements.create({ data:{
          organizationId, submissionKey: randomUUID(), recordedById: actorId,
          [`${prefix}LocationId`]: locationId, [`${prefix}ResponsibleEmployeeId`]: employee[person].id,
          [`${prefix}Temperature`]: values.temperature, [`${prefix}RadiationLevel`]: values.radiationLevel,
          [`${prefix}Humidity`]: values.humidity, [`${prefix}Pressure`]: values.pressure,
        } });
      }
    }
  });
}

module.exports = { seedConcept, seedStorage };
