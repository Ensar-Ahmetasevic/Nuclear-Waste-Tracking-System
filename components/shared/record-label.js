"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { encode } from "uqr";
import { LuPrinter, LuQrCode } from "react-icons/lu";
import { recordCode, recordPath } from "../../lib/record-codes.cjs";
import { RadiationMark } from "../shell/nav-parts";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import useReviewDialog from "./use-review-dialog";

// Black modules on white, drawn as one path; crispEdges keeps them sharp on
// label printers. Medium error correction survives scuffs on a container.
function QrCode({ value, className }) {
  const { size, data } = useMemo(
    () => encode(value, { ecc: "M", border: 2 }),
    [value],
  );
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")),
    )
    .join("");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

// The label itself, 90 × 50 mm on screen and on paper, always black on white.
export function RecordLabel({ kind, id, url, lines = [], printedAt }) {
  const t = useT();
  const format = useFormat();
  return (
    <div className="flex h-[50mm] w-[90mm] shrink-0 items-center gap-[3mm] overflow-hidden rounded-[2mm] border border-black bg-white p-[3mm] text-black">
      <QrCode value={url} className="size-[44mm] shrink-0" />
      <div className="flex h-full min-w-0 flex-1 flex-col gap-[1mm] py-[1mm]">
        <span className="flex items-center gap-[1.5mm] text-[9pt] font-bold tracking-wide">
          <RadiationMark className="size-[4mm]" />
          {t("app.name")}
        </span>
        <span className="text-[7pt] font-semibold tracking-wider uppercase">
          {t(`label.kind.${kind}`)}
        </span>
        <span className="font-mono text-[12pt] leading-tight font-bold [overflow-wrap:anywhere]">
          {recordCode(kind, id)}
        </span>
        {lines.filter(Boolean).map((line) => (
          <span key={line} className="line-clamp-2 text-[7pt] leading-snug">
            {line}
          </span>
        ))}
        <span className="mt-auto text-[6pt] leading-snug">
          {t("label.printed", { time: format.dateTime(printedAt) })}
        </span>
      </div>
    </div>
  );
}

// Button and dialog for printing the label of a shipment or Container Profile.
// While the dialog is open a copy of the label sits directly under <body>; the
// print stylesheet prints only that copy, so the page layout does not matter.
export default function LabelButton({ kind, id, lines, className = "" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn min-h-11 border-base-content/20 btn-ghost ${className}`}
        onClick={() => setOpen(true)}
      >
        <LuQrCode className="size-4" aria-hidden="true" />
        {t("label.button")}
      </button>
      {open && (
        <LabelDialog
          kind={kind}
          id={id}
          lines={lines}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function LabelDialog({ kind, id, lines, onClose }) {
  const t = useT();
  const titleId = useId();
  const { dialog, heading, keepFocus } = useReviewDialog("view");
  const [printedAt] = useState(() => new Date().toISOString());
  const url = `${window.location.origin}${recordPath(kind, id)}`;
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    const node = document.createElement("div");
    node.className = "print-sheet";
    document.body.append(node);
    setSheet(node);
    return () => node.remove();
  }, []);
  const label = (
    <RecordLabel
      kind={kind}
      id={id}
      url={url}
      lines={lines}
      printedAt={printedAt}
    />
  );
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
        className="text-2xl font-semibold"
      >
        {t("label.title", { code: recordCode(kind, id) })}
      </h2>
      <p className="my-3 text-sm text-base-content/75">{t("label.desc")}</p>
      <div className="my-5 flex justify-center overflow-x-auto">{label}</div>
      <p className="text-sm [overflow-wrap:anywhere] text-base-content/75">
        {t("label.opens")} <span className="font-mono">{url}</span>
      </p>
      <p className="mt-1 text-sm text-base-content/75">{t("label.note")}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn min-h-11 border-base-content/20 btn-ghost"
          onClick={onClose}
        >
          {t("label.close")}
        </button>
        <button
          type="button"
          className="btn min-h-11 btn-primary"
          onClick={() => window.print()}
        >
          <LuPrinter className="size-4" aria-hidden="true" />
          {t("label.print")}
        </button>
      </div>
      {sheet && createPortal(label, sheet)}
    </dialog>
  );
}
