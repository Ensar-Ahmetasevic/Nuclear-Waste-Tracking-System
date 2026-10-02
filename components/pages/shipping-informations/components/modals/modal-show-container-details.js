"use client";

import { useEffect, useId, useRef } from "react";
import { useT } from "../../../../shell/preferences";
import MessageText from "../../../../ui/message-text";

// Internal identifiers mean nothing to the reader.
const HIDDEN = new Set([
  "id",
  "organizationId",
  "archivedAt",
  "containerTypeId",
]);
// Names and addresses stay as written; descriptions follow the interface language.
const AS_WRITTEN = new Set(["name", "address"]);

export default function ModalShowContainerDetails({
  modalContenData,
  title,
  closeModal,
}) {
  const t = useT();
  // Known fields use the interface language; others fall back to the field name.
  const label = (key) => {
    const text = t(`def.field.${key}`);
    return text === `def.field.${key}` ? formatKey(key) : text;
  };
  const dialog = useRef(null);
  const heading = useRef(null);
  const closeButton = useRef(null);
  const titleId = useId();
  // The record's own name is the heading; the kind of record sits above it.
  const name =
    typeof modalContenData?.name === "string" && modalContenData.name.trim()
      ? modalContenData.name
      : null;

  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        closeModal();
      }}
      onKeyDown={(event) => {
        // This read-only dialog has one interactive control.
        if (event.key === "Tab") {
          event.preventDefault();
          closeButton.current?.focus();
        }
      }}
    >
      {name && (
        <p className="font-mono text-xs font-semibold tracking-widest text-step-1 uppercase">
          {title}
        </p>
      )}
      <h2
        ref={heading}
        id={titleId}
        tabIndex={-1}
        className="mt-1 text-2xl font-bold break-words"
      >
        {name || t("details.title", { title })}
      </h2>
      {modalContenData ? (
        // Read like a data sheet: label beside value, a thin line between rows.
        <dl className="mt-4 divide-y divide-base-content/10 border-y border-base-content/10">
          {Object.entries(modalContenData)
            .filter(([key]) => !HIDDEN.has(key) && !(name && key === "name"))
            .map(([key, value]) => {
              const text =
                value == null || value === ""
                  ? t("ship.notRecorded")
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);
              return (
                <div
                  key={key}
                  className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-sm break-words text-base-content/65">
                    {label(key)}
                  </dt>
                  <dd
                    className={`text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap ${value == null || value === "" ? "text-base-content/60" : ""}`}
                  >
                    {typeof value === "string" &&
                    value.trim() &&
                    !AS_WRITTEN.has(key) ? (
                      <MessageText text={value} />
                    ) : (
                      text
                    )}
                  </dd>
                </div>
              );
            })}
        </dl>
      ) : (
        <p>{t("details.none")}</p>
      )}
      <div className="mt-6 flex justify-end">
        <button
          ref={closeButton}
          type="button"
          className="btn min-h-11 border-base-content/20 btn-ghost"
          onClick={closeModal}
        >
          {t("def.closeDetails")}
        </button>
      </div>
    </dialog>
  );
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}
