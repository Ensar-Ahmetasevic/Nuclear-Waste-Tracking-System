// Data transcribed from "Nuclear Waste Tracking System - Concept doc.pdf" (September 11, 2026).
// Example data, not operational guidance. PDF IDs are labels, not database IDs.
// Values marked "not in the concept doc" were added so every account has a person.

const organization = {
  name: 'Bundesgesellschaft für Endlagerung mbH (BGE)',
  // The PDF company ID 1651-3131531 does not fit the integer column; its first part is kept.
  companyId: 1651,
  address: 'Chemnitzer Straße 27b, 38226 Salzgitter',
};

// Administrative levels. The PDF spells the supervisor and employee domains "konorad".
const administrator = {
  email: 'info-konrad@bge.de',
  username: 'katharina.brandt',
  displayName: 'Katharina Brandt', // not in the concept doc
  address: organization.address,
};

const accounts = [
  { username: 'idriz.javric', email: 'idriz-konorad@bge.de', role: 'SUPERVISION', workArea: null, displayName: 'Idriz Javric', address: 'Mühlenweg 12, 33098 Paderborn' },
  // "Entering data for the type of waste" is the Step 1 shipping work area.
  { username: 'kris.schmidt', email: 'kris-konorad@bge.de', role: 'EMPLOYEE', workArea: 'SHIPPING', displayName: 'Kris Schmidt', address: 'Mühlenweg 12, 33098 Paderborn' },
  // Not in the concept doc.
  { username: 'lena.hoffmann', email: 'lena-konorad@bge.de', role: 'EMPLOYEE', workArea: 'PRE_STORAGE', displayName: 'Lena Hoffmann', address: 'Lindenallee 8, 38226 Salzgitter' },
  { username: 'emir.hadzic', email: 'emir-konorad@bge.de', role: 'EMPLOYEE', workArea: 'FINAL_STORAGE', displayName: 'Emir Hadžić', address: 'Berliner Straße 41, 38226 Salzgitter' },
];

// Step 1: Shipping informations, ID 000025. The PDF time is "xx.yy.cccc 12:00:52".
const shipment = {
  companyName: 'Transport GmbH',
  driverName: 'Jusuf Basic',
  registrationPlates: '23 TS 5047',
  truckStatus: 'IN',
  arrivalTime: '12:00:52',
};

const commonWaste = {
  processingMethods: 'Deep digging in geological formations, monitoring and measurement of radiation',
  biologicalProperties: 'No relevant biological properties',
  collectionProcedures: 'Use of special containers with additional layers of protection, use help of robots',
};

// Container Profiles 00202 and 00322. The PDF summary labels M001/M002 refer to M01/M02;
// a waste profile's transport recommendation is its container type.
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

// Step 2 halls and Step 3 rooms. The PDF lists the halls' waste profile and container
// type the other way round; the app matches Waste Profile names (M01) to incoming
// Container Profiles and Container Type names between halls and rooms.
const preStorageLocations = [
  { name: 'Hall 1', surfaceArea: 1000, containerFootprint: 2, containerType: 'Strengthened steel container', wasteProfile: 'M01', preStorageFor: 'Radioactive waste from nuclear facilities' },
  { name: 'Hall 2', surfaceArea: 1000, containerFootprint: 2, containerType: 'Concrete container', wasteProfile: 'M02', preStorageFor: 'Radioactive waste from pharmaceutical and medical facilities' },
];
const finalStorageLocations = [
  { name: 'Room 01', containerType: 'Strengthened steel container', surfaceArea: 200, depth: 1000, containerFootprint: 2 },
  { name: 'Room 02', containerType: 'Concrete container', surfaceArea: 200, depth: 800, containerFootprint: 2 },
];

const technician = 'Technician for radioactive waste';
const preStorageEmployees = [
  { name: 'Alex', surname: 'Müller', dateOfBirth: '1984-11-12', address: 'Mühlenweg 12, 33098 Paderborn', qualifications: technician, safetyTraining: true },
  { name: 'Jasmin', surname: 'Mujkic', dateOfBirth: '1974-06-28', address: 'Srnice Gornje bb, 76250 Gradacac, BiH', qualifications: technician, safetyTraining: true },
];
const finalStorageEmployees = [
  { name: 'Tim', surname: 'Schwarz', dateOfBirth: '1982-08-08', address: 'Mühlenweg 12, 33098 Paderborn', qualifications: technician, safetyTraining: true },
  { name: 'Ahmet', surname: 'Mujkic', dateOfBirth: '1978-07-12', address: 'Rosenstraße 23, 10178 Berlin', qualifications: technician, safetyTraining: true },
];

// Steps 2.1 and 3.1 give only the optimal ranges (-5 to 35 °C, 0 to 0.1 µSv/h, 40 to 60 %,
// 1010 to 1020 hPa). One measurement per hall and room within them; values not in the concept doc.
const preStorageConditions = [
  { location: 'Hall 1', employee: 'Alex Müller', temperature: 18.4, radiationLevel: 0.06, humidity: 47, pressure: 1014 },
  { location: 'Hall 2', employee: 'Jasmin Mujkic', temperature: 19.1, radiationLevel: 0.04, humidity: 51, pressure: 1016 },
];
const finalStorageConditions = [
  { location: 'Room 01', employee: 'Tim Schwarz', temperature: 29.5, radiationLevel: 0.08, humidity: 44, pressure: 1018 },
  { location: 'Room 02', employee: 'Ahmet Mujkic', temperature: 27.8, radiationLevel: 0.05, humidity: 46, pressure: 1017 },
];

module.exports = {
  organization, administrator, accounts, shipment, groups,
  preStorageLocations, finalStorageLocations, preStorageEmployees, finalStorageEmployees,
  preStorageConditions, finalStorageConditions,
};
