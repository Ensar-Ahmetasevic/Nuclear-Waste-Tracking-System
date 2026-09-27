"use client";

import { useEffect, useId, useRef } from "react";
import { useT } from "../../../../shell/preferences";

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
      <h2
        ref={heading}
        id={titleId}
        tabIndex={-1}
        className="mb-6 text-xl font-bold break-words"
      >
        {t("details.title", { title })}
      </h2>
      {modalContenData ? (
        <dl className="space-y-4">
          {Object.entries(modalContenData).map(([key, value]) => (
            <div key={key}>
              <dt className="font-semibold break-words">{label(key)}</dt>
              <dd className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                {value == null || value === ""
                  ? t("ship.notRecorded")
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>{t("details.none")}</p>
      )}
      <div className="mt-6 flex justify-end">
        <button
          ref={closeButton}
          type="button"
          className="btn min-h-11 btn-outline"
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
