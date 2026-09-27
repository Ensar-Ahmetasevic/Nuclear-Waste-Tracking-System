"use client";
import { useT } from "../../shell/preferences";

// Read-only view of an administrator's correction report. Labels: recon.report.<key>.
export const reportSections = ["incident", "cause", "actions", "references"];

export default function CorrectionReport({ report }) {
  const t = useT();
  if (!report) return <p className="text-sm">{t("recon.report.none")}</p>;
  return (
    <dl className="space-y-2">
      {reportSections
        .filter((key) => report[key])
        .map((key) => (
          <div
            key={key}
            className="rounded-lg bg-base-200/70 p-2 [overflow-wrap:anywhere]"
          >
            <dt className="font-semibold">{t(`recon.report.${key}`)}</dt>
            <dd className="whitespace-pre-line">{report[key]}</dd>
          </div>
        ))}
    </dl>
  );
}
