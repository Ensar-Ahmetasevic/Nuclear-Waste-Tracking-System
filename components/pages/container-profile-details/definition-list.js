"use client";

import { useState } from "react";
import { DEFINITIONS } from "@/lib/definitions";
import DataFreshness from "@/components/shared/data-freshness";
import useLocationOriginQuery from "@/requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import useWasteProfileQuery from "@/requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useContainerTypeQuery from "@/requests/request-container-profile/request-container-type/use-fetch-container-type-query";
import usePreStorageLocationQuery from "@/requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-location-query";
import usePreStorageEmployeeQuery from "@/requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import useFinalStorageLocationQuery from "@/requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-location-query";
import useFinalStorageEmployeeQuery from "@/requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";
import EmptyState from "../../ui/empty-state";
import StatusChip from "../../ui/status-chip";
import DefinitionChangeDialog from "./definition-change-dialog";
import DefinitionDetailsDialog from "./definition-details-dialog";
import { useDefinitionText } from "./definition-text";
import { InlineLoader } from "../../loading/loaders";

const queries = {
  LOCATION_ORIGIN: useLocationOriginQuery,
  WASTE_PROFILE: useWasteProfileQuery,
  CONTAINER_TYPE: useContainerTypeQuery,
  PRE_STORAGE_LOCATION: usePreStorageLocationQuery,
  PRE_STORAGE_EMPLOYEE: usePreStorageEmployeeQuery,
  FINAL_STORAGE_LOCATION: useFinalStorageLocationQuery,
  FINAL_STORAGE_EMPLOYEE: useFinalStorageEmployeeQuery,
};

// Why an action is unavailable, shown as visible text rather than only a tooltip.
function blockedActions(t, kind, row) {
  const waste = row.usage?.wasteProfile;
  if (!DEFINITIONS[kind].lockEdits)
    return {
      DELETE: row.locked
        ? `${t("def.blocked.deleteReferenced")}${DEFINITIONS[kind].archivable && !row.archivedAt ? ` ${t("def.blocked.deactivateInstead")}` : ""}`
        : null,
    };
  return {
    UPDATE: row.archivedAt
      ? t("def.blocked.restoreFirst")
      : row.locked
        ? t("def.blocked.editLocked")
        : null,
    ARCHIVE:
      kind === "CONTAINER_TYPE" && waste && !waste.archivedAt
        ? t("def.blocked.archiveWaste", { name: waste.name })
        : null,
    RESTORE:
      kind === "WASTE_PROFILE" && row.containerType?.archivedAt
        ? t("def.blocked.restoreType", { name: row.containerType.name })
        : null,
    DELETE: row.locked
      ? t("def.blocked.delete")
      : kind === "CONTAINER_TYPE" && waste
        ? t("def.blocked.deleteUsedByWaste", { name: waste.name })
        : null,
  };
}

export const displayName = (row) =>
  [row.name, row.surname].filter(Boolean).join(" ");

export default function DefinitionList({ kind }) {
  const text = useDefinitionText();
  const { t } = text;
  const definition = DEFINITIONS[kind];
  const query = queries[kind]();
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(null);
  const rows = query.data || [];
  const archivedCount = rows.filter((row) => row.archivedAt).length;
  const visible = showArchived ? rows : rows.filter((row) => !row.archivedAt);
  const words = definition.archivable ? text.words(kind) : null;

  return (
    <section
      className="w-full min-w-0 space-y-4"
      aria-labelledby="definition-list-heading"
    >
      <h3 id="definition-list-heading" tabIndex={-1} className="sr-only">
        {text.kind(kind)} · {text.entries(kind)}
      </h3>
      <p className="text-sm text-base-content/70">
        {t(definition.lockEdits ? "def.intro.locked" : "def.intro.storage")}
        {definition.archivable &&
          !definition.lockEdits &&
          ` ${t("def.intro.deactivate")}`}
      </p>
      <DataFreshness query={query} />
      {definition.archivable && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          {t("def.showArchived", { state: words.state, count: archivedCount })}
        </label>
      )}
      {query.isPending ? (
        <InlineLoader />
      ) : query.isError && !query.data ? (
        <p role="alert">
          {t("def.loadError")}{" "}
          <button
            type="button"
            className="btn min-h-11"
            onClick={() => query.refetch()}
          >
            {t("alert.retry")}
          </button>
        </p>
      ) : !visible.length ? (
        <EmptyState>
          {rows.length
            ? t("def.allArchived", { state: words?.state })
            : t("def.none", { kind: text.kind(kind) })}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((row) => {
            const blocked = blockedActions(t, kind, row);
            const noteId = `definition-${kind}-${row.id}-note`;
            const lock = text.lockReason(kind, row);
            const notes = [
              lock &&
                t(definition.lockEdits ? "def.note.locked" : "def.note.inUse", {
                  reason: lock,
                }),
              ...Object.values(blocked),
            ].filter(Boolean);
            const label = `${text.kind(kind)} ${displayName(row)}`;
            const button = (
              action,
              name,
              className = "border-base-content/20 btn-ghost",
            ) => (
              <button
                type="button"
                className={`btn min-h-11 btn-sm ${className}`}
                disabled={Boolean(blocked[action])}
                aria-describedby={blocked[action] ? noteId : undefined}
                aria-label={`${name} ${label}`}
                onClick={() => setOpen({ action, row })}
              >
                {name}
              </button>
            );
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-base-content/15 p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="font-semibold [overflow-wrap:anywhere]">
                    {displayName(row)}
                  </h4>
                  <span className="font-mono text-xs text-base-content/65">
                    #{row.id}
                  </span>
                  {row.archivedAt && (
                    <StatusChip tone="neutral">{words.state}</StatusChip>
                  )}
                </div>
                <p className="text-sm [overflow-wrap:anywhere] text-base-content/80">
                  {text.usage(kind, row)}
                </p>
                {notes.length > 0 && (
                  <div
                    id={noteId}
                    className="space-y-1 text-sm [overflow-wrap:anywhere] text-base-content/70"
                  >
                    {notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
                    aria-label={t("def.detailsFor", { name: label })}
                    onClick={() => setOpen({ action: "DETAILS", row })}
                  >
                    {t("def.details")}
                  </button>
                  {button("UPDATE", t("def.edit"))}
                  {definition.archivable &&
                    (row.archivedAt
                      ? button("RESTORE", words.restore)
                      : button("ARCHIVE", words.archive))}
                  {button("DELETE", t("def.delete"), "btn-soft btn-error")}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {open?.action === "DETAILS" && (
        <DefinitionDetailsDialog
          kind={kind}
          row={open.row}
          onClose={() => setOpen(null)}
        />
      )}
      {open && open.action !== "DETAILS" && (
        <DefinitionChangeDialog
          kind={kind}
          action={open.action}
          row={open.row}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
