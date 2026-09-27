// Shared by the definition API and the administrator UI so review, audit
// snapshots and validation always describe the same fields.
const text = (key, label, multiline = false) => ({ key, label, type: "text", multiline });
const number = (key, label, unit) => ({ key, label, type: "number", unit });
const integer = (key, label, unit) => ({ key, label, type: "integer", unit });
// Personal values are shown while reviewing an open change, but only the fact
// that they changed is copied into the change history.
const personal = field => ({ ...field, personal: true });

export const DEFINITION_TEXT_LIMIT = 10000;

// Wording for the reversible "stop new use" action of each kind.
const archiveWords = { archive: "Archive", restore: "Restore", state: "Archived", archiveNoun: "archiving", restoreNoun: "restoring", archived: "archived", restored: "restored" };
const deactivationWords = { archive: "Deactivate", restore: "Reactivate", state: "Inactive", archiveNoun: "deactivation", restoreNoun: "reactivation", archived: "deactivated", restored: "reactivated" };

export const DEFINITIONS = {
  LOCATION_ORIGIN: {
    label: "Location Origin",
    model: "locationOrigin",
    // Used definitions keep their meaning: they are locked and can be archived instead.
    lockEdits: true,
    archivable: true,
    words: archiveWords,
    path: "/api/container-profile/location-origin",
    listKey: "locationOriginData",
    queryKey: "locationOriginQueryKey",
    fields: [text("name", "Name"), text("address", "Address"), text("origin", "Origin", true)],
  },
  WASTE_PROFILE: {
    label: "Waste Profile",
    model: "wasteProfile",
    lockEdits: true,
    archivable: true,
    words: archiveWords,
    path: "/api/container-profile/waste-profile",
    listKey: "wasteProfileData",
    queryKey: "wasteProfileQueryKey",
    fields: [
      text("name", "Name"),
      text("typeOfWaste", "Type of waste"),
      text("wasteDescription", "Waste description", true),
      text("risksAndHazards", "Risks and hazards", true),
      text("processingMethods", "Processing methods", true),
      text("physicalProperties", "Physical properties", true),
      text("chemicalProperties", "Chemical properties", true),
      text("biologicalProperties", "Biological properties", true),
      text("collectionProcedures", "Collection procedures", true),
      { key: "containerTypeId", label: "Recommended Container Type", type: "reference" },
    ],
  },
  CONTAINER_TYPE: {
    label: "Container Type",
    model: "containerType",
    lockEdits: true,
    archivable: true,
    words: archiveWords,
    path: "/api/container-profile/container-type",
    listKey: "containerTypeData",
    queryKey: "containerTypeQueryKey",
    fields: [
      text("name", "Name"),
      text("material", "Material"),
      number("volume", "Volume", "m³"),
      number("carryingCapacity", "Carrying capacity", "tons"),
      text("radioactivityLevel", "Radioactivity level"),
      text("physicalProperties", "Physical properties", true),
      number("footprint", "Footprint", "m²"),
      text("description", "Description", true),
    ],
  },
};

// Storage configuration stays editable as a recorded correction of the same hall
// or person; deletion is refused while receipts, measurements or transfers refer to it.
const employeeFields = [
  text("name", "Name"),
  text("surname", "Surname"),
  personal({ key: "dateOfBirth", label: "Date of birth", type: "date" }),
  personal(text("address", "Address")),
  text("qualifications", "Qualifications", true),
  { key: "safetyTraining", label: "Safety training", type: "boolean" },
];

export const STORAGE_CONFIGURATION = {
  PRE_STORAGE_LOCATION: {
    label: "Pre-Storage Location",
    model: "preStorageLocation",
    path: "/api/pre-storage-setup/pre-storage-location",
    listKey: "preStorageLocationData",
    queryKey: "preStorageLocationQueryKey",
    fields: [
      text("name", "Name"),
      integer("surfaceArea", "Surface area", "m²"),
      integer("containerFootprint", "Container footprint", "m²"),
      text("containerType", "Container Type"),
      text("wasteProfile", "Waste Profile"),
      text("preStorageFor", "Pre-storage for"),
    ],
    matchingNote: "Waste Profile is matched by name to incoming Container Profiles, and Container Type by name to Final-Storage halls for transfer requests. Changing these texts changes which work this hall is offered; existing receipts are not moved.",
  },
  FINAL_STORAGE_LOCATION: {
    label: "Final-Storage Location",
    model: "finalStorageLocation",
    path: "/api/final-storage-setup/final-storage-location",
    listKey: "finalStorageLocationData",
    queryKey: "finalStorageLocationQueryKey",
    fields: [
      text("name", "Name"),
      integer("surfaceArea", "Surface area", "m²"),
      integer("depth", "Depth", "m"),
      text("containerType", "Container Type"),
      integer("containerFootprint", "Container footprint", "m²"),
    ],
    matchingNote: "Container Type is matched by name to Pre-Storage halls for transfer requests. Changing it changes which transfers this hall is offered; existing transfers are not moved.",
  },
  PRE_STORAGE_EMPLOYEE: {
    label: "Pre-Storage Responsible Employee",
    model: "preStorageResponsibleEmployee",
    path: "/api/pre-storage-setup/pre-storage-employee",
    listKey: "preStorageEmployeeData",
    queryKey: "preStorageEmployeeQueryKey",
    fields: employeeFields,
  },
  FINAL_STORAGE_EMPLOYEE: {
    label: "Final-Storage Responsible Employee",
    model: "finalStorageResponsibleEmployee",
    path: "/api/final-storage-setup/final-storage-employee",
    listKey: "finalStorageEmployeeData",
    queryKey: "finalStorageEmployeeQueryKey",
    fields: employeeFields,
  },
};
for (const configuration of Object.values(STORAGE_CONFIGURATION)) Object.assign(configuration, { lockEdits: false, archivable: false });
// A person who no longer works here keeps their history but cannot be chosen for new records.
for (const kind of ["PRE_STORAGE_EMPLOYEE", "FINAL_STORAGE_EMPLOYEE"]) Object.assign(STORAGE_CONFIGURATION[kind], { archivable: true, words: deactivationWords });
Object.assign(DEFINITIONS, STORAGE_CONFIGURATION);

export const DEFINITION_ACTIONS = {
  CREATE: "Created",
  UPDATE: "Edited",
  ARCHIVE: "Archived",
  RESTORE: "Restored",
  DELETE: "Deleted",
};

export const definitionActionLabel = (kind, action) => {
  const words = DEFINITIONS[kind].words;
  if (words && action === "ARCHIVE") return words.archived[0].toUpperCase() + words.archived.slice(1);
  if (words && action === "RESTORE") return words.restored[0].toUpperCase() + words.restored.slice(1);
  return DEFINITION_ACTIONS[action];
};

export const DEFINITION_QUERY_KEYS = Object.values(DEFINITIONS).map(definition => definition.queryKey);

// Plain-language summary of what currently relies on a definition row.
export function definitionUsageSummary(kind, row) {
  const usage = row?.usage || {};
  if (STORAGE_CONFIGURATION[kind]) {
    return usage.references?.length ? `Referenced by ${usage.references.map(item => `${item.count} ${item.label}${item.count === 1 ? "" : "s"}`).join(", ")}` : "No recorded receipts, measurements or transfers";
  }
  const events = `${usage.historyRecords ?? 0} recorded profile event${usage.historyRecords === 1 ? "" : "s"}`;
  if (kind === "CONTAINER_TYPE") {
    return usage.wasteProfile
      ? `Recommended by Waste Profile “${usage.wasteProfile.name}” (${usage.containerProfiles ?? 0} Container Profiles) · ${events}`
      : `Not assigned to a Waste Profile · ${events}`;
  }
  return `${usage.containerProfiles ?? 0} Container Profile${usage.containerProfiles === 1 ? "" : "s"} · ${events}`;
}
