const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  console.log("Starting seed...");

  const seedAdminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const seedAdminPassword = requireEnv("SEED_ADMIN_PASSWORD");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. User Profile
  // ─────────────────────────────────────────────────────────────────────────────
  // User already exists in DB – fetch it without modifying
  let user = await prisma.userProfile.findUnique({
    where: { email: seedAdminEmail },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash(seedAdminPassword, 10);
    user = await prisma.userProfile.create({
      data: {
        email: seedAdminEmail,
        password: hashedPassword,
        companyId: 1001,
        companyName: "Demo Nuclear GmbH",
        address: "Demo Street 1",
        administrator: true,
      },
    });
    console.log("✓ User created:", user.email);
  } else {
    console.log("✓ User already exists:", user.email);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Container Types (from PDF: M01, M02 - Concrete container)
  // ─────────────────────────────────────────────────────────────────────────────
  const containerTypeM01 = await prisma.containerType.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "M01",
      material: "Reinforced steel",
      volume: 0.208,
      carryingCapacity: 400.0,
      radioactivityLevel: "Low to medium",
      physicalProperties:
        "Cylindrical drum, sealed lid, corrosion-resistant coating",
      footprint: 0.28,
      description:
        "Standard steel drum for low to medium-level radioactive waste, suitable for solid and semi-solid materials from medical and research facilities.",
    },
  });

  const containerTypeM02 = await prisma.containerType.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "M02",
      material: "Concrete with steel lining",
      volume: 1.5,
      carryingCapacity: 2500.0,
      radioactivityLevel: "Medium to high",
      physicalProperties:
        "Rectangular block, thick concrete walls, steel inner lining, sealed with bolted lid",
      footprint: 1.2,
      description:
        "Heavy-duty concrete container for medium to high-level radioactive waste. Used for liquid and solid radioactive materials from nuclear facilities and pharmaceutical plants.",
    },
  });
  console.log("✓ Container types created: M01, M02");

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Waste Profiles (from PDF: M001, M002)
  // ─────────────────────────────────────────────────────────────────────────────
  const wasteProfileM001 = await prisma.wasteProfile.upsert({
    where: { containerTypeId: 1 },
    update: {},
    create: {
      name: "M001",
      typeOfWaste:
        "Radioactive waste from pharmaceutical and medical facilities",
      wasteDescription:
        "Low to medium-level radioactive waste generated from medical diagnostics, radiotherapy, and pharmaceutical manufacturing processes. Includes used syringes, protective gear, and contaminated lab equipment.",
      risksAndHazards:
        "Radiation exposure risk, potential contamination of groundwater if improperly stored. Alpha and beta emitters present.",
      processingMethods:
        "Solidification with cement, volume reduction by incineration where applicable, packaging in approved steel drums (M01).",
      physicalProperties:
        "Solid and semi-solid form, low to medium level of radiation",
      chemicalProperties:
        "Contains short-lived radioactive isotopes (e.g., Tc-99m, I-131)",
      biologicalProperties:
        "Potential biological hazard from medical waste; no direct biological activity in isotopes",
      collectionProcedures:
        "Use of protective equipment (PPE), collection in approved M01 containers, labeling with radiation symbol and waste code, transport via certified nuclear waste vehicle.",
      containerTypeId: 1,
    },
  });

  const wasteProfileM002 = await prisma.wasteProfile.upsert({
    where: { containerTypeId: 2 },
    update: {},
    create: {
      name: "M002",
      typeOfWaste: "Radioactive waste from nuclear facilities",
      wasteDescription:
        "Medium to high-level radioactive waste from nuclear power plant operations. Includes spent fuel reprocessing residues, contaminated coolant fluids, and reactor maintenance materials.",
      risksAndHazards:
        "High radiation exposure risk, gamma radiation, heat generation from radioactive decay. Long half-life isotopes require long-term isolation.",
      processingMethods:
        "Vitrification (glass solidification), encapsulation in concrete containers (M02), deep geological disposal as final step.",
      physicalProperties: "Liquid form, medium to high level of radiation",
      chemicalProperties: "Contains radioactive isotopes",
      biologicalProperties: "No relevant biological properties",
      collectionProcedures:
        "Use of special containers with additional layers of protection, use help of robots",
      containerTypeId: 2,
    },
  });
  console.log("✓ Waste profiles created: M001, M002");

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Location Origins (from PDF: Zwischenlager Ahaus)
  // ─────────────────────────────────────────────────────────────────────────────
  const locationAhaus = await prisma.locationOrigin.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Zwischenlager Ahaus",
      address: "Convergenzstraße 1, 48683 Ahaus, Deutschland",
      origin: "Nuclear power plant operations and fuel reprocessing",
    },
  });

  const locationJuelich = await prisma.locationOrigin.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Zwischenlager Jülich",
      address: "Wilhelm-Johnen-Straße, 52428 Jülich, Deutschland",
      origin: "Research reactor and experimental nuclear facility",
    },
  });

  const locationPharmaMunich = await prisma.locationOrigin.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Pharma Zentrum München",
      address: "Leopoldstraße 175, 80804 München, Deutschland",
      origin: "Pharmaceutical manufacturing and radiopharmaceutical production",
    },
  });
  console.log("✓ Location origins created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Pre-Storage Responsible Employees
  // ─────────────────────────────────────────────────────────────────────────────
  const preEmployee1 = await prisma.preStorageResponsibleEmployee.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Hans",
      surname: "Müller",
      dateOfBirth: new Date("1975-03-15"),
      address: "Berliner Str. 22, 10115 Berlin",
      qualifications:
        "Certified Nuclear Waste Handler (Level 3), Radiation Protection Officer, IAEA Safety Training Certificate",
      safetyTraining: true,
    },
  });

  const preEmployee2 = await prisma.preStorageResponsibleEmployee.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Klara",
      surname: "Schmidt",
      dateOfBirth: new Date("1982-07-22"),
      address: "Hamburger Allee 88, 60486 Frankfurt",
      qualifications:
        "Nuclear Safety Engineer, Pre-Storage Supervisor Certificate, Emergency Response Training",
      safetyTraining: true,
    },
  });
  console.log("✓ Pre-storage employees created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Pre-Storage Locations (from PDF: Hale 1, Hale 2)
  // ─────────────────────────────────────────────────────────────────────────────
  const preStorageHale1 = await prisma.preStorageLocation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Hale 1",
      surfaceArea: 320,
      containerFootprint: 1,
      preStorageFor:
        "Radioactive waste from pharmaceutical and medical facilities",
      containerType: "M01",
      wasteProfile: "M001",
    },
  });

  const preStorageHale2 = await prisma.preStorageLocation.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Hale 2",
      surfaceArea: 480,
      containerFootprint: 1,
      preStorageFor: "Radioactive waste from nuclear facilities",
      containerType: "M02",
      wasteProfile: "M002",
    },
  });
  console.log("✓ Pre-storage locations created: Hale 1, Hale 2");

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Pre-Storage Conditions (initial readings)
  // ─────────────────────────────────────────────────────────────────────────────
  await prisma.preStorageConditions.createMany({
    data: [
      {
        preStorageTemperature: 18.5,
        preStorageRadiationLevel: 0.12,
        preStorageHumidity: 45.0,
        preStoragePressure: 1013,
        preStorageLocationId: 1,
        preStorageResponsibleEmployeeId: 1,
      },
      {
        preStorageTemperature: 19.2,
        preStorageRadiationLevel: 2.85,
        preStorageHumidity: 42.5,
        preStoragePressure: 1012,
        preStorageLocationId: 2,
        preStorageResponsibleEmployeeId: 2,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Pre-storage conditions created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Final Storage Responsible Employees
  // ─────────────────────────────────────────────────────────────────────────────
  const finalEmployee1 = await prisma.finalStorageResponsibleEmployee.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Franz",
      surname: "Weber",
      dateOfBirth: new Date("1968-11-04"),
      address: "Münchner Str. 55, 80331 München",
      qualifications:
        "Deep Geological Disposal Engineer, Final Storage Operator (Level 5), IAEA Advanced Safety Certification",
      safetyTraining: true,
    },
  });

  const finalEmployee2 = await prisma.finalStorageResponsibleEmployee.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Anna",
      surname: "Fischer",
      dateOfBirth: new Date("1979-05-18"),
      address: "Kurfürstendamm 12, 10719 Berlin",
      qualifications:
        "Radiation Safety Officer, Final Storage Supervisor, WANO Peer Review Participant",
      safetyTraining: true,
    },
  });
  console.log("✓ Final storage employees created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Final Storage Locations (from PDF: W001, W002)
  // ─────────────────────────────────────────────────────────────────────────────
  const finalStorageW001 = await prisma.finalStorageLocation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "W001",
      containerType: "M01",
      containerFootprint: 1,
      surfaceArea: 400,
      depth: 50,
      quantity: 0,
    },
  });

  const finalStorageW002 = await prisma.finalStorageLocation.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "W002",
      containerType: "M02",
      containerFootprint: 1,
      surfaceArea: 500,
      depth: 80,
      quantity: 0,
    },
  });
  console.log("✓ Final storage locations created: W001, W002");

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Final Storage Conditions (initial readings)
  // ─────────────────────────────────────────────────────────────────────────────
  await prisma.finalStorageCondition.createMany({
    data: [
      {
        finalStorageTemperature: 12.0,
        finalStorageRadiationLevel: 0.08,
        finalStorageHumidity: 35.0,
        finalStoragePressure: 1015.0,
        finalStorageLocationId: 1,
        finalStorageResponsibleEmployeeId: 1,
      },
      {
        finalStorageTemperature: 14.5,
        finalStorageRadiationLevel: 5.2,
        finalStorageHumidity: 33.0,
        finalStoragePressure: 1014.0,
        finalStorageLocationId: 2,
        finalStorageResponsibleEmployeeId: 2,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Final storage conditions created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Shipping Information (from PDF: quantity 12, Zwischenlager Ahaus, M002)
  // ─────────────────────────────────────────────────────────────────────────────
  const shipping1 = await prisma.shippingInformation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      entryDateTime: new Date("2024-10-15T08:30:00"),
      exitDateTime: new Date("2024-10-15T11:45:00"),
      truckStatus: "OUT",
      status: "accepted",
      companyName: "Nuclear Transport GmbH",
      driverName: "Otto Braun",
      registrationPlates: "B-NT 2024",
      userProfileId: user.id,
    },
  });

  const shipping2 = await prisma.shippingInformation.upsert({
    where: { id: 2 },
    update: {},
    create: {
      entryDateTime: new Date("2024-11-05T09:00:00"),
      truckStatus: "IN",
      status: "pending",
      companyName: "RadiLogistik AG",
      driverName: "Werner Kohl",
      registrationPlates: "MUC-RL 789",
    },
  });
  console.log("✓ Shipping informations created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. Container Profiles (from PDF: quantity 12, Zwischenlager Ahaus, M002)
  // ─────────────────────────────────────────────────────────────────────────────
  await prisma.containerProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      quantity: 12,
      containerStatus: "accepted",
      shippingInformationId: shipping1.id,
      locationOriginId: locationAhaus.id,
      wasteProfileId: wasteProfileM002.id,
    },
  });

  await prisma.containerProfile.upsert({
    where: { id: 2 },
    update: {},
    create: {
      quantity: 6,
      containerStatus: "accepted",
      shippingInformationId: shipping1.id,
      locationOriginId: locationJuelich.id,
      wasteProfileId: wasteProfileM001.id,
    },
  });

  await prisma.containerProfile.upsert({
    where: { id: 3 },
    update: {},
    create: {
      quantity: 8,
      containerStatus: "pending",
      shippingInformationId: shipping2.id,
      locationOriginId: locationPharmaMunich.id,
      wasteProfileId: wasteProfileM001.id,
    },
  });
  console.log("✓ Container profiles created");

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. Pre-Storage Entries
  // ─────────────────────────────────────────────────────────────────────────────
  await prisma.preStorageEntry.upsert({
    where: { id: 1 },
    update: {},
    create: {
      quantity: 6,
      preStorageLocationId: preStorageHale1.id,
      responsiblePreStorageEmployeeId: preEmployee1.id,
    },
  });

  await prisma.preStorageEntry.upsert({
    where: { id: 2 },
    update: {},
    create: {
      quantity: 12,
      preStorageLocationId: preStorageHale2.id,
      responsiblePreStorageEmployeeId: preEmployee2.id,
    },
  });
  console.log("✓ Pre-storage entries created");

  console.log("\n✅ Seed completed successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Login credentials:");
  console.log(`  Email:    ${seedAdminEmail}`);
  console.log("  Password: managed by SEED_ADMIN_PASSWORD");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
