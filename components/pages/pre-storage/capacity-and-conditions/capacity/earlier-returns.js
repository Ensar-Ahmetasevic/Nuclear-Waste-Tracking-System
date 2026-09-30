"use client";
import { LuCheck, LuShieldAlert, LuUndo2 } from "react-icons/lu";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { personLabel } from "../../../../shared/person-label";
import MessageText from "../../../../ui/message-text";

// Earlier returns of these incoming profiles: what Pre-storage found, and what
// Shipments or Supervision corrected before sending them again.
export const earlierReturns = (profiles = []) => {
  const reports = new Map();
  for (const profile of profiles)
    for (const report of profile.returnHistory || []) reports.set(report.id, report);
  return [...reports.values()].sort((a, b) => b.id - a.id);
};

const CHANGED = ["quantity", "locationOrigin", "wasteProfile"];
const ICONS = { RETURN: LuUndo2, ESCALATED: LuShieldAlert, RESENT: LuCheck };

// One line per event, notes on request: what happened, when and who.
function ReturnTimeline({ report }) {
  const t = useT();
  const format = useFormat();
  const counted = report.profiles.filter((row) => row.countedQuantity != null);
  const events = [
    {
      key: "return",
      icon: "RETURN",
      at: report.createdAt,
      title: t("retHist.event.returned", { hall: report.hall || `#${report.locationId}` }),
      detail: [
        ...counted.map((row) =>
          t("retHist.counted", { counted: format.number(row.countedQuantity), expected: format.number(row.expectedQuantity) }),
        ),
        ...report.reasons
          .filter((code) => code !== "QUANTITY_MISMATCH" || !counted.length)
          .map((code) => t(`return.reasonShort.${code}`)),
      ].join(" · "),
      who: report.responsibleEmployee,
      note: report.note,
    },
    ...report.actions.map((row) => ({
      key: `action-${row.id}`,
      icon: row.action,
      at: row.createdAt,
      title: t(`return.action.${row.action}`),
      detail: row.changes
        .flatMap((change) =>
          CHANGED.filter((key) => change.before[key] !== change.after[key]).map(
            (key) => `${t(`field.${key}`)} ${change.before[key]} → ${change.after[key]}`,
          ),
        )
        .join(" · "),
      who: `${personLabel(t, row.actorName, row.actorId)} (${t(`return.actor.${row.actorRole}`)})`,
      note: row.note,
    })),
  ];
  const notes = events.filter((event) => event.note);
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {events.map(({ key, icon, at, title, detail, who }) => {
          const Icon = ICONS[icon];
          return (
            <li key={key} className="flex gap-2.5">
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${icon === "RESENT" ? "text-success" : icon === "ESCALATED" ? "text-warning" : "text-error"}`}
                aria-hidden="true"
              />
              <p className="min-w-0">
                <span className="font-medium">{title}</span>
                {detail && <span> · {detail}</span>}
                <span className="block text-xs text-base-content/60">
                  {format.dateTime(at)}
                  {who && ` · ${who}`}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      {notes.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-base-content/70">
            {t("retHist.notes", { count: notes.length })}
          </summary>
          <ul className="space-y-1.5 pb-1">
            {notes.map((event) => (
              <li key={event.key} className="break-words">
                <span className="font-medium">{event.title}:</span> <MessageText text={event.note} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function EarlierReturns({ profiles }) {
  const t = useT();
  const reports = earlierReturns(profiles);
  if (!reports.length) return null;
  return (
    <section
      aria-label={t("retHist.title")}
      className="my-4 space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm"
    >
      <p className="font-semibold text-warning">{t("retHist.title")}</p>
      {reports.map((report) => (
        <ReturnTimeline key={report.id} report={report} />
      ))}
    </section>
  );
}
