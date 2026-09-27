"use client";
import { LuUndo2 } from "react-icons/lu";
import { useT } from "../../../shell/preferences";
import { useFormat } from "../../../ui/format";
import StatusChip from "../../../ui/status-chip";
import { personLabel } from "../../../shared/person-label";

const STATE_TONE = { open: "error", escalated: "warning", resolved: "neutral" };
const CHANGE_FIELDS = ["quantity", "locationOrigin", "wasteProfile"];

// Pre-storage inspection report of a return and what Step 1 or Supervision did
// with it. With profileId only that profile's counted quantity is shown.
export default function ReturnReport({ report, profileId = null, showState = false }) {
  const t = useT();
  const format = useFormat();
  const counted = report.profiles.filter(
    (row) => row.countedQuantity != null && (profileId == null || row.containerProfileId === profileId),
  );
  const hall = report.hall || `#${report.locationId}`;
  const resolved = report.state === "resolved";
  return (
    <section
      aria-label={t("return.title")}
      className={`space-y-2 rounded-xl border p-4 text-sm ${
        resolved ? "border-base-content/15 bg-base-200/60" : "border-error/40 bg-error/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold ${resolved ? "" : "text-error"}`}>
          <LuUndo2 className="size-4" aria-hidden="true" />
          {t("return.titleNumber", { id: report.id })}
          <span className="font-normal text-base-content/75">
            {t("return.meta", { hall, time: format.dateTime(report.createdAt) })}
          </span>
        </p>
        {showState && report.state && (
          <StatusChip tone={STATE_TONE[report.state]}>{t(`return.state.${report.state}`)}</StatusChip>
        )}
      </div>
      <div>
        <p className="font-medium">{t("return.reasons")}</p>
        <ul className="mt-1 list-disc pl-5">
          {report.reasons.map((code) => (
            <li key={code}>{t(`return.reason.${code}`)}</li>
          ))}
        </ul>
      </div>
      {counted.map((row) => (
        <p key={row.containerProfileId} className="font-semibold">
          {profileId == null && `${t("ship.profile", { id: row.containerProfileId })}: `}
          {t("return.counted", {
            counted: format.number(row.countedQuantity),
            expected: format.number(row.expectedQuantity),
          })}
        </p>
      ))}
      {report.note && (
        <p className="break-words">
          <span className="font-medium">{t("return.note")}:</span> {report.note}
        </p>
      )}
      <p className="text-base-content/70">
        {t("return.by", {
          person: report.responsibleEmployee || `#${report.responsibleEmployeeId}`,
          actor: personLabel(t, report.actorName, report.actorId),
        })}
      </p>
      {report.actions?.length > 0 && (
        <ol className="space-y-2 border-t border-base-content/10 pt-2">
          {report.actions.map((row) => (
            <li key={row.id}>
              <p className="font-medium">
                {t(`return.action.${row.action}`)}{" "}
                <span className="font-normal text-base-content/70">
                  {t("return.action.meta", {
                    time: format.dateTime(row.createdAt),
                    who: t(`return.actor.${row.actorRole}`),
                    actor: personLabel(t, row.actorName, row.actorId),
                  })}
                </span>
              </p>
              {row.changes.map((change) =>
                CHANGE_FIELDS.filter((key) => change.before[key] !== change.after[key]).map((key) => (
                  <p key={`${change.containerProfileId}-${key}`}>
                    {t("return.action.change", {
                      id: change.containerProfileId,
                      field: t(`field.${key}`),
                      before: key === "quantity" ? format.number(change.before[key]) : change.before[key],
                      after: key === "quantity" ? format.number(change.after[key]) : change.after[key],
                    })}
                  </p>
                )),
              )}
              <p className="break-words">{row.note}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
