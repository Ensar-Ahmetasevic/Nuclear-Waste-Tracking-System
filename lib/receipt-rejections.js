// Reasons Pre-storage records when it returns incoming Container Profiles to Step 1.
// Shared by the API and the UI; labels are in lib/i18n.js as "return.reason.<code>".
export const REJECTION_REASONS = [
  "QUANTITY_MISMATCH",
  "DAMAGED_CONTAINER",
  "INADEQUATE_PACKAGING",
  "LABELLING",
  "DOCUMENTS",
  "CONTENT_MISMATCH",
  "CONTAMINATION",
  "LEAKAGE",
  "OTHER",
];

// A quantity mismatch needs the counted quantity of each profile; "Other" needs a note.
// Returns a problem code (UI label "ret.problem.<code>") or null.
export function rejectionProblem({ reasons, note, profiles }) {
  if (!Array.isArray(reasons) || !reasons.length || reasons.some((code) => !REJECTION_REASONS.includes(code)) || new Set(reasons).size !== reasons.length)
    return "reasons";
  if (typeof note !== "string" || note.trim().length > 1000) return "noteLength";
  if (reasons.includes("OTHER") && note.trim().length < 3) return "noteRequired";
  if (reasons.includes("QUANTITY_MISMATCH")) {
    if (profiles.some((row) => !Number.isSafeInteger(row.countedQuantity) || row.countedQuantity < 0 || row.countedQuantity > 100000))
      return "counted";
    if (profiles.every((row) => row.countedQuantity === row.quantity)) return "countedEqual";
  } else if (profiles.some((row) => row.countedQuantity != null)) return "countedUnexpected";
  return null;
}

export const REJECTION_PROBLEMS = {
  reasons: "Choose at least one reason",
  noteLength: "The note may have at most 1000 characters",
  noteRequired: "Describe the reason (at least 3 characters)",
  counted: "Enter the counted number of containers for every profile",
  countedEqual: "The counted quantity matches the recorded quantity",
  countedUnexpected: "A counted quantity belongs to a quantity mismatch",
};
