"use client";
import { DEFINITIONS, STORAGE_CONFIGURATION } from "@/lib/definitions";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";

// Interface wording for definitions and storage configuration. lib/definitions.js
// keeps the English labels the server uses for validation and audit messages;
// here the same fields are described in the interface language by key.
export function useDefinitionText() {
  const t = useT();
  const format = useFormat();
  const count = (key, value) => t(key, { count: value });
  const archiveType = (kind) =>
    DEFINITIONS[kind].words?.archive === "Deactivate" ? "person" : "definition";
  const words = (kind) => {
    const type = archiveType(kind);
    return Object.fromEntries(
      [
        "archive",
        "restore",
        "state",
        "archiveNoun",
        "restoreNoun",
        "archived",
        "restored",
      ].map((word) => [word, t(`def.words.${type}.${word}`)]),
    );
  };
  const kind = (value) => t(`def.kind.${value}`);
  const field = (item) => t(`def.field.${item.key}`);
  const unit = (item) => (item.unit ? t(`def.unit.${item.unit}`) : "");
  const entries = (value) =>
    t(DEFINITIONS[value].lockEdits ? "def.definitions" : "def.entries");
  const references = (list) =>
    list.map((item) => count(`def.ref.${item.label}`, item.count)).join(", ");

  function usage(value, row) {
    const used = row?.usage || {};
    if (STORAGE_CONFIGURATION[value])
      return used.references?.length
        ? t("def.usage.referenced", { list: references(used.references) })
        : t("def.usage.unreferenced");
    const events = count("def.usage.events", used.historyRecords ?? 0);
    if (value === "CONTAINER_TYPE")
      return used.wasteProfile
        ? t("def.usage.recommended", {
            name: used.wasteProfile.name,
            profiles: count("def.usage.profiles", used.containerProfiles ?? 0),
            events,
          })
        : t("def.usage.unassigned", { events });
    return `${count("def.usage.profiles", used.containerProfiles ?? 0)} · ${events}`;
  }

  // The same rule as describeDefinitionUsage on the server, in the interface language.
  function lockReason(value, row) {
    if (!row?.lockReason) return null;
    const used = row.usage || {};
    if (STORAGE_CONFIGURATION[value]) {
      const list = [...(used.references || [])];
      if (
        value === "FINAL_STORAGE_LOCATION" &&
        row.quantity > 0 &&
        !list.some((item) => item.label === "recorded stored container")
      )
        list.push({ label: "recorded stored container", count: row.quantity });
      return t("def.lock.referenced", { list: references(list) });
    }
    if (value === "CONTAINER_TYPE" && used.wasteProfile?.locked)
      return t("def.lock.recommended", { name: used.wasteProfile.name });
    if (value !== "CONTAINER_TYPE" && used.containerProfiles)
      return t("def.lock.usedBy", {
        list: count("def.usage.profiles", used.containerProfiles),
      });
    return t("def.lock.usedBy", {
      list: count("def.usage.events", used.historyRecords ?? 0),
    });
  }

  function action(value, name) {
    if (["ARCHIVE", "RESTORE"].includes(name)) {
      const text = words(value)[name === "ARCHIVE" ? "archived" : "restored"];
      return text[0].toUpperCase() + text.slice(1);
    }
    return t(`def.action.${name}`);
  }

  // Normalized field value as the server compares and records it.
  const normalized = (item, value) =>
    value == null
      ? value
      : item.type === "date"
        ? String(value).slice(0, 10)
        : value;
  function value(item, raw, snapshot) {
    if (item.personal && snapshot && !(item.key in snapshot))
      return snapshot.changedFields?.includes(item.key)
        ? t("def.value.changedHidden")
        : t("def.value.notStored");
    if (raw === null || raw === undefined || raw === "")
      return t("ship.notRecorded");
    if (item.type === "reference")
      return `${snapshot?.containerTypeName || kind("CONTAINER_TYPE")} (#${raw})`;
    if (item.type === "number" || item.type === "integer")
      return `${format.decimal(raw)} ${unit(item)}`;
    if (item.type === "boolean") return raw ? t("def.yes") : t("def.no");
    if (item.type === "date") return normalized(item, raw);
    return String(raw);
  }

  function consequence(value, name, original) {
    if (STORAGE_CONFIGURATION[value])
      return t(
        name === "UPDATE"
          ? original?.locked
            ? "def.consequence.storage.UPDATE.locked"
            : "def.consequence.storage.UPDATE"
          : `def.consequence.storage.${name}`,
      );
    return t(`def.consequence.${name}`);
  }

  return {
    t,
    format,
    words,
    kind,
    field,
    unit,
    entries,
    usage,
    lockReason,
    action,
    value,
    consequence,
  };
}
