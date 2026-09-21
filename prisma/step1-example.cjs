// Transcription of Step 1, Concept doc.pdf (September 11, 2026).
// Example data, not operational guidance. PDF IDs are labels, not database IDs.
const shipment = {
  companyName: 'Transport GmbH',
  driverName: 'Jusuf Basic',
  registrationPlates: '23 TS 5047',
  // PDF supplies only xx.yy.cccc 12:00:52. Use an explicit demo date in CEST.
  entryDateTime: new Date('2026-09-11T12:00:52+02:00'),
  truckStatus: 'IN',
};
const commonWaste = {
  processingMethods: 'Deep digging in geological formations, monitoring and measurement of radiation',
  biologicalProperties: 'No relevant biological properties',
  collectionProcedures: 'Use of special containers with additional layers of protection, use help of robots',
};
const groups = [
  {
    sourceProfileId: '00202', quantity: 15,
    location: {
      name: 'Zwischenlager Brokdorf', address: 'Osterende, 25576 Brokdorf',
      origin: 'Radioactive waste from nuclear facilities Brokdorf',
    },
    waste: {
      ...commonWaste, name: 'M01',
      typeOfWaste: 'Radioactive waste from nuclear facilities',
      wasteDescription: 'Highly radioactive materials generated in nuclear energy processes',
      risksAndHazards: 'Extreme radiation risk, need for the highest handling safety measures',
      physicalProperties: 'Liquid form, high level of radiation',
      chemicalProperties: 'Contains nuclear materials with high radioactivity',
    },
    container: {
      name: 'Strengthened steel container', material: 'Strengthened steel',
      volume: 15, carryingCapacity: 7, footprint: 2, radioactivityLevel: 'High risk',
      physicalProperties: 'Extremely tough, protective coatings against corrosion',
      description: 'Suitable for waste with a high degree of radioactivity, such as radioactive materials from nuclear facilities. Strengthened steel provides additional strength and resistance, which protects against external influences and maintains the integrity of the container',
    },
  },
  {
    sourceProfileId: '00322', quantity: 12,
    location: {
      name: 'Zwischenlager Ahaus', address: 'Ammeln 59, 48683 Ahaus',
      origin: 'Nuclear waste obtained from laboratory research and medical procedures',
    },
    waste: {
      ...commonWaste, name: 'M02',
      typeOfWaste: 'Radioactive waste from laboratory research',
      wasteDescription: 'Materials containing radioactive isotopes used in laboratory experiments and analyses',
      risksAndHazards: 'Moderate to high radiation risk, need for careful handling and disposal',
      physicalProperties: 'Liquid form, medium to high level of radiation',
      chemicalProperties: 'Contains radioactive isotopes',
    },
    container: {
      name: 'Concrete container', material: 'Concrete',
      volume: 15, carryingCapacity: 6, footprint: 2, radioactivityLevel: 'High risk',
      physicalProperties: 'Resistant to radiation, solid',
      description: 'Suitable for waste of medium and high levels of radioactivity. Concrete possesses excellent radiation shielding characteristics and is frequently used for containers containing waste with an increased risk',
    },
  },
];
module.exports = { shipment, groups };
