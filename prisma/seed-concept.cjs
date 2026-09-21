// Examples transcribed from "Nuclear Waste Tracking System - Concept doc.pdf".
// Demo fixtures only: these descriptions are not validated operational guidance.
async function seedConcept(prisma, organizationId) {
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
    const steel = await ensure('containerType', 'Strengthened steel container (Demo)', {
      material:'Strengthened steel', volume:15, carryingCapacity:7, footprint:2,
      radioactivityLevel:'High risk (concept example)', physicalProperties:'Concept demo: extremely tough; protective coatings against corrosion.',
      description:'DEMO — Concept document example for testing only. Steel container for radioactive materials from nuclear facilities. Volume: 15 m³; carrying capacity: 7 tons; footprint: 2 m².',
    });
    const concrete = await ensure('containerType', 'Concrete container (Demo)', {
      material:'Concrete', volume:15, carryingCapacity:6, footprint:2,
      radioactivityLevel:'High risk (concept example)', physicalProperties:'Concept demo: resistant to radiation; solid.',
      description:'DEMO — Concept document example for testing only. Concrete container for medium and high radioactivity waste. Volume: 15 m³; carrying capacity: 6 tons; footprint: 2 m².',
    });
    const common = {
      processingMethods:'Concept demo: geological disposal with radiation monitoring; not validated operational guidance.',
      biologicalProperties:'Concept demo: no relevant biological properties.',
      collectionProcedures:'Concept demo: special protected containers and robotic handling; not validated operational guidance.',
    };
    const m01 = await ensure('wasteProfile', 'M01 (Demo)', { ...common, containerTypeId:steel.id,
      typeOfWaste:'Radioactive waste from nuclear facilities', wasteDescription:'DEMO: highly radioactive materials generated in nuclear energy processes.',
      risksAndHazards:'Concept demo: extreme radiation risk.', physicalProperties:'Concept demo: liquid form; high radiation level.', chemicalProperties:'Concept demo: nuclear materials with high radioactivity.',
    });
    const m02 = await ensure('wasteProfile', 'M02 (Demo)', { ...common, containerTypeId:concrete.id,
      typeOfWaste:'Radioactive waste from laboratory research', wasteDescription:'DEMO: radioactive isotopes used in laboratory experiments and analyses.',
      risksAndHazards:'Concept demo: moderate to high radiation risk.', physicalProperties:'Concept demo: liquid form; medium to high radiation level.', chemicalProperties:'Concept demo: contains radioactive isotopes.',
    });
    const brokdorf = await ensure('locationOrigin', 'Zwischenlager Brokdorf (Demo)', { address:'Osterende, 25576 Brokdorf', origin:'Concept demo: radioactive waste from nuclear facilities Brokdorf.' });
    const ahaus = await ensure('locationOrigin', 'Zwischenlager Ahaus (Demo)', { address:'Ammeln 59, 48683 Ahaus', origin:'Concept demo: nuclear waste from laboratory research and medical procedures.' });
    let shipment = await tx.shippingInformation.findFirst({ where:{ organizationId, registrationPlates:'DEMO-CONCEPT-001' } });
    if (!shipment) {
      shipment = await tx.shippingInformation.create({ data:{ organizationId, companyName:'Transport GmbH (Concept Demo)', driverName:'Demo driver', registrationPlates:'DEMO-CONCEPT-001', truckStatus:'IN', containerProfiles:{ create:[
        { organizationId, quantity:15, locationOriginId:brokdorf.id, wasteProfileId:m01.id },
        { organizationId, quantity:12, locationOriginId:ahaus.id, wasteProfileId:m02.id },
      ] } } });
    }
    return { shipmentId:shipment.id, wasteProfileIds:[m01.id,m02.id], locationOriginIds:[brokdorf.id,ahaus.id] };
  });
}
module.exports = { seedConcept };
