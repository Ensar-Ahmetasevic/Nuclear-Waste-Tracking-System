"use client";

import { useEffect, useId, useRef } from "react";
import { DEFINITIONS } from "@/lib/definitions";
import DefinitionHistory from "./definition-history";
import { useDefinitionText } from "./definition-text";

export default function DefinitionDetailsDialog({ kind, row, onClose }) {
  const text = useDefinitionText();
  const { t, format } = text;
  const definition = DEFINITIONS[kind];
  const dialog = useRef(null),
    heading = useRef(null),
    titleId = useId();
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, []);
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll("button:not(:disabled), summary"),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === heading.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  const snapshot = { ...row, containerTypeName: row.containerType?.name };
  const lock = text.lockReason(kind, row);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold [overflow-wrap:anywhere]"
      >
        {text.kind(kind)} #{row.id}:{" "}
        {[row.name, row.surname].filter(Boolean).join(" ")}
      </h2>
      <p className="my-3 text-sm text-base-content/80">
        {definition.archivable
          ? `${row.archivedAt ? t("def.stateSince", { state: text.words(kind).state, time: format.dateTime(row.archivedAt) }) : t("users.active")} · `
          : ""}
        {text.usage(kind, row)}
      </p>
      {lock && (
        <p className="my-3 rounded-xl border border-base-content/20 p-3 text-sm">
          {t(
            definition.lockEdits ? "def.details.locked" : "def.details.inUse",
            { reason: lock },
          )}
        </p>
      )}
      <dl className="grid gap-2.5 sm:grid-cols-2">
        {definition.fields.map((field) => (
          <div
            key={field.key}
            className="rounded-xl bg-base-200/70 px-3 py-2.5 [overflow-wrap:anywhere]"
          >
            <dt className="text-xs text-base-content/65">
              {text.field(field)}
            </dt>
            <dd className="font-medium whitespace-pre-line">
              {text.value(field, row[field.key], snapshot)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <DefinitionHistory kind={kind} definitionId={row.id} compact />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          onClick={onClose}
        >
          {t("def.closeDetails")}
        </button>
      </div>
    </dialog>
  );
}
